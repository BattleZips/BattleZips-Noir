
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy-ethers";

const config: HardhatUserConfig = {
  mocha: {
    timeout: 1200000
  },
  networks: {
    hardhat: {
      blockGasLimit: 10000000,
      gasPrice: 10,
      hardfork: 'istanbul',
    },
  },
  solidity: {
    version: '0.8.10',
    settings: {
      evmVersion: 'london',
      optimizer: { enabled: true, runs: 5000 },
    },
  },
};

export default config;