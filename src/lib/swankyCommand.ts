import { Command, Flags, Interfaces } from "@oclif/core";
import {
  getSwankySystemConfig,
  getSwankyConfig,
  Spinner,
  findSwankySystemConfigPath,
  buildSwankyConfig,
} from "./index.js";
import { SwankyConfig, SwankySystemConfig } from "../types/index.js";
import { writeJSON } from "fs-extra/esm";
import { mkdirSync, existsSync } from "fs";
import { BaseError, ConfigError, UnknownError } from "./errors.js";
import { swankyLogger } from "./logger.js";
import { Logger } from "winston";
import path from "node:path";
export type Flags<T extends typeof Command> = Interfaces.InferredFlags<
  (typeof SwankyCommand)["baseFlags"] & T["flags"]
>;
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T["args"]>;

export abstract class SwankyCommand<T extends typeof Command> extends Command {
  static ENSURE_SWANKY_CONFIG = true;

  protected spinner!: Spinner;
  protected swankyConfig!: SwankyConfig;
  protected logger!: Logger;

  protected flags!: Flags<T>;
  protected args!: Args<T>;

  public async init(): Promise<void> {
    await super.init();
    this.spinner = new Spinner();

    const { args, flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof SwankyCommand).baseFlags,
      args: this.ctor.args,
      strict: this.ctor.strict,
    });
    this.flags = flags as Flags<T>;
    this.args = args as Args<T>;

    this.logger = swankyLogger;
    this.swankyConfig = buildSwankyConfig();

    try {
      const systemConfig = await getSwankySystemConfig();
      this.swankyConfig = {
        ...this.swankyConfig,
        ...systemConfig,
      };
    } catch (error) {
      this.logger.warn("No system config found")
    }

    try {
      const localConfig = await getSwankyConfig();
      this.swankyConfig = {
        ...this.swankyConfig,
        ...localConfig,
      };
    } catch (error) {
      this.logger.warn("No local config found")
      if (error instanceof Error &&
        error.message.includes("swanky.config.json") &&
        (this.constructor as typeof SwankyCommand).ENSURE_SWANKY_CONFIG
      )
        throw new ConfigError(`Cannot find ${process.env.SWANKY_CONFIG ?? "swanky.config.json"}`, { cause: error });
    }

    this.logger.info(`Running command: ${this.ctor.name}
      Args: ${JSON.stringify(this.args)}
      Flags: ${JSON.stringify(this.flags)}
      Full command: ${JSON.stringify(process.argv)}`);
  }

  protected async storeConfig(projectPath: string) {
    const configPath = process.env.SWANKY_CONFIG ?? path.resolve(projectPath, "swanky.config.json");
    const localConfig : SwankyConfig = {
      ...this.swankyConfig,
    }
    await writeJSON(configPath, localConfig, { spaces: 2 });
  }

  protected async storeSystemConfig() {
    const systemConfig : SwankySystemConfig = {
      defaultAccount: this.swankyConfig.defaultAccount,
      accounts: this.swankyConfig.accounts,
      networks: this.swankyConfig.networks
    }

    const configPath = findSwankySystemConfigPath();

    if (!existsSync(path.resolve(configPath))) {
      mkdirSync(path.resolve(configPath), { recursive: true });
    }
    await writeJSON(configPath + "/swanky.config.json", systemConfig, { spaces: 2 });
  }
  protected async catch(err: Error & { exitCode?: number }): Promise<any> {
    // add any custom logic to handle errors from the command
    // or simply return the parent class error handling
    const error = BaseError.normalize(err, UnknownError);
    this.logger.error(error);
  }

  protected async finally(_: Error | undefined): Promise<any> {
    // called after run and catch regardless of whether or not the command errored
    // console.log("Swanky Config: ", this.swankyConfig);
    return super.finally(_);
  }
}

// Static property baseFlags needs to be defined like this (for now) because of the way TS transpiles ESNEXT code
// https://github.com/oclif/oclif/issues/1100#issuecomment-1454910926
SwankyCommand.baseFlags = {
  verbose: Flags.boolean({
    required: false,
    description: "Display more info in the result logs",
    char: "v",
  }),
};
