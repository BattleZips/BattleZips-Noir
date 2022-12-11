
import dotenv from 'dotenv';
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy-ethers";
dotenv.config();

const { INFURA, MNEMONIC } = process.env;



// map of chain to rpc url 
const RPCS = {
  goerli: `https://goerli.infura.io/v3/${INFURA}`,
  gnosis: 'https://rpc.gnosischain.com',
  polygon: 'https://matic-mainnet.chainstacklabs.com',
  polygonMumbai: 'https://matic-mumbai.chainstacklabs.com',
  rinkeby: `https://rinkeby.infura.io/v3/${INFURA}`,
}

// derive 10 accounts from mnemonic
const accounts = {
  mnemonic: MNEMONIC,
  path: "m/44'/60'/0'/0",
  initialIndex: 0,
  count: 10,
}

/**
 * Return a hardhat network object for a given network
 * @param {string} network - the name of the hardhat network
 */
const makeNetwork = (network) => {
  return {
    url: RPCS[network],
    accounts
  }
}

const networks = Object.entries(RPCS).reduce((obj, network) => {
  obj[network[0]] = makeNetwork(network[0]);
  return obj;
}, {})

networks['hardhat'] = { accounts }

const config: HardhatUserConfig = {
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