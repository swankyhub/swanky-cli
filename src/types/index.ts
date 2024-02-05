import { SubmittableExtrinsic } from "@polkadot/api/types";

export type KeypairType = "ed25519" | "sr25519" | "ecdsa" | "ethereum";

export interface ChainProperty {
  tokenSymbols: string[];
  tokenDecimals: number[];
  chainName: string;
  ss58Prefix: number;
}

export type ExtrinsicPayload = SubmittableExtrinsic<"promise">;

export interface Encrypted { iv: string; data: string }

export interface AccountData {
  isDev: boolean;
  alias: string;
  mnemonic: string | Encrypted;
  address: string;
}

export interface ContractData {
  name: string;
  moduleName: string;
  build?: BuildData;
  deployments: DeploymentData[];
}

export interface BuildData {
  timestamp: number;
  artifactsPath: string;
}

export interface DeploymentData {
  timestamp: number;
  networkUrl: string;
  deployerAlias: string;
  address: string;
}
export interface SwankyConfig extends SwankySystemConfig{
  node: {
    polkadotPalletVersions: string;
    localPath: string;
    supportedInk: string;
  };
  contracts: Record<string, ContractData> | Record<string, never>;
}

export interface SwankySystemConfig {
  defaultAccount: string | null;
  accounts: AccountData[];
  networks: Record<string, {url: string}>
}

export type SupportedPlatforms = "darwin" | "linux";
export type SupportedArch = "arm64" | "x64";
