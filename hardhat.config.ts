
import dotenv from 'dotenv';
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy-ethers";
dotenv.config();

const { ETHERSCAN_KEY, INFURA, MNEMONIC } = process.env;

interface iAccounts {
  mnemonic: string,
  path: string,
  initialIndex: number,
  count: number,
}

interface iRPCs {
  [key: string]: string;
}

interface iNetworks {
  [key: string]: {
    url?: string,
    accounts: iAccounts
  };
}



// map of chain to rpc url 
const RPCS : iRPCs = {
  goerli: `https://goerli.infura.io/v3/${INFURA}`,
  gnosis: 'https://rpc.gnosischain.com',
  polygon: 'https://matic-mainnet.chainstacklabs.com',
  polygonMumbai: 'https://matic-mumbai.chainstacklabs.com',
}

// derive 10 accounts from mnemonic
const accounts : iAccounts = {
  mnemonic: MNEMONIC as unknown as string,
  path: "m/44'/60'/0'/0",
  initialIndex: 0,
  count: 10,
}

/**
 * Return a hardhat network object for a given network
 * @param {string} network - the name of the hardhat network
 */
const makeNetwork = (network : string) => {
  return {
    url: RPCS[network],
    accounts
  }
}

const networks = Object.entries(RPCS).reduce((obj : iNetworks, network) => {
  obj[network[0]] = makeNetwork(network[0]);
  return obj;
}, {})

networks['hardhat'] = { accounts }

const config: HardhatUserConfig = {
  etherscan: {
    apiKey: {
      goerli: ETHERSCAN_KEY!
    }
  },
  mocha: {
    timeout: 2000000
  },
  networks,
  solidity: {
    version: '0.8.10',
    settings: {
      evmVersion: 'london',
      optimizer: { enabled: true, runs: 5000 },
    },
  },
};

export default config;
