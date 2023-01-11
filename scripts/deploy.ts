import fs, { existsSync, mkdirSync } from 'fs';
import { ethers } from 'hardhat';
import { resolve } from 'path';
import { delay, printLog, verifyContracts } from '../utils';

const DEPLOY_PATH = resolve(__dirname, '../deploy');

/**
 * Main function to deploy contracts to specifcied network
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);

  console.log('Account balance:', (await deployer.getBalance()).toString());

  printLog('Deploying board verifier...');
  const bvFactory = await ethers.getContractFactory('BoardVerifier');
  const bv = await bvFactory.deploy();
  console.log('Board verifier deployed to: ', bv.address);
  printLog('Deploying shot verifier...');
  const svFactory = await ethers.getContractFactory('ShotVerifier');
  const sv = await svFactory.deploy();
  console.log('Shot verifier deployed to: ', sv.address);

  printLog('Deploying Battleship Game...');
  const gameFactory = await ethers.getContractFactory('BattleshipGame');
  const game = await gameFactory.deploy(ethers.constants.AddressZero, bv.address, sv.address);
  console.log('Battleship Game deployed to: ', game.address);
  // Check if deploy exists, if not mkdir
  if (!existsSync(DEPLOY_PATH)) {
    mkdirSync(DEPLOY_PATH);
  }
  fs.writeFileSync('deploy/contracts.json', JSON.stringify({
    BattleshipGame: game.address,
    BoardVerifier: bv.address,
    ShotVerifier: sv.address
  }))
  // Contracts may take a while to propogate to etherscan so delay function is used to provide a 30
  // second buffer
  console.log('Waiting 30 seconds for contracts to propogate to etherscan');
  await delay(30000);
  console.log('Verifying contracts on Etherscan...')
  await verifyContracts();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });