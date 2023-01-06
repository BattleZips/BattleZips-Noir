import { readFileSync } from 'fs';
import { ethers, run } from 'hardhat';
import { alreadyVerified, delay, printLog } from '../utils';

/**
 * Helper function to verify contracts on etherscan. Can be run via CLI in the event the deploy script is interrupted after
 * contract deployment but before verification. Contracts are read in from deployment file
 */
export const verifyContracts = async () => {
    const buff = readFileSync('deploy/contracts.json');
    const { BattleshipGame, BoardVerifier, ShotVerifier } = JSON.parse(buff.toString());
    const contracts = [
        {
            address: BoardVerifier,
            constructorArguments: [],
            name: 'Board Verifier'
        },
        {
            address: ShotVerifier,
            constructorArguments: [],
            name: 'Shot Verifier'
        },
        {
            address: BattleshipGame,
            constructorArguments: [ethers.constants.AddressZero, BoardVerifier, ShotVerifier],
            name: 'Battleship Game'
        },
    ];

    let index = 0;
    while (index < contracts.length) {
        const { address, constructorArguments, name } = contracts[index];
        try {
            printLog(`Verifying ${name}`);
            await run(`verify:verify`, {
                address,
                constructorArguments,
            });
            printLog(`${name} verified`);
            index++;
        } catch (err) {
            // If already verified we continue to the next contract
            if (alreadyVerified(err.toString())) {
                console.log(`${name} already verified`);
                index++;
                // If contract has yet to propogate to etherscan we delay another 30 seconds to allow for this and
                // iterate through the loop again
            } else {
                console.log('Verification error. Waiting 30 more seconds for contracts to propogate');
                console.log('Error: ', err);
                await delay(30000);
            }
        }
    }
}

verifyContracts();