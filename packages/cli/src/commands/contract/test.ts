require("ts-mocha");
import { Command, Flags } from "@oclif/core";
import path = require("node:path");
import { ensureSwankyProject, getSwankyConfig } from "@astar-network/swanky-core";
import globby from "globby";
import Mocha from "mocha";
import { ensureDir, readdirSync } from "fs-extra";
import * as shell from "shelljs";

declare global {
  var contractTypesPath: string; // eslint-disable-line no-var
}

export class CompileContract extends Command {
  static description = "Run tests for a given contact";

  // hidden until the mocha loading issue is resolved
  static hidden = true;

  static flags = {
    all: Flags.boolean({
      default: false,
      char: "a",
      description: "Set all to true to compile all contracts"
    })
  };

  static args = [
    {
      name: "contractName",
      required: false,
      default: "",
      description: "Name of the contract to compile",
    },
  ];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CompileContract);

    if (args.contractName == "" && !flags.all) {
      this.error("No contracts were selected to compile")
    }

    await ensureSwankyProject();
    const config = await getSwankyConfig();

    const contractNames = [];
    if (flags.all) {
      const contractList = readdirSync(path.resolve("contracts"), { withFileTypes: true });
      for (const contract of contractList) {
        if (contract.isDirectory()) {
          console.log(`${contract.name} contract is found`);
          contractNames.push(contract.name);
        }
      }
    } else {
      contractNames.push(args.contractName);
    }

    const projectDir = path.resolve();
    const testDir = path.resolve("test");
    for (const contractName of contractNames) {
      const contractInfo = config.contracts[contractName];
      if (!contractInfo.build) {
        this.error(`Cannot find build data for ${contractName} contract in swanky.config.json`);
      }
      const buildData = contractInfo.build;

      const reportDir = path.resolve(projectDir, buildData.artifactsPath, "testReports", Date.now().toString());
      await ensureDir(reportDir);
  
      const mocha = new Mocha({
        timeout: 200000,
        reporter: "mochawesome",
        reporterOptions: {
          reportDir,
          charts: true,
          reportTitle: `${contractName} test report`,
          quiet: true,
          json: false,
        },
      });
  
      const tests = await globby(`${path.resolve(testDir, contractName)}/*.test.ts`);
  
      mocha.addFile;
      tests.forEach((test) => {
        mocha.addFile(test);
      });
  
      global.contractTypesPath = path.resolve(testDir, contractName, "typedContract");
  
      shell.cd(`${testDir}/${contractName}`);
      try {
        await new Promise<void>((resolve, reject) => {
          mocha.run((failures) => {
            if (failures) {
              reject(`At least one of the tests failed. Check report for details: ${reportDir}`);
            } else {
              this.log(`All tests passing. Check the report for details: ${reportDir}`);
              resolve();
            }
          });
        });
      } catch (error) {
        this.error(error as string);
      }
    }
  }
}
