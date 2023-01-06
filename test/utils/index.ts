import { BarretenbergWasm } from '@noir-lang/barretenberg/dest/wasm';
import { SinglePedersen } from '@noir-lang/barretenberg/dest/crypto';
import { ethers } from 'hardhat';
import { numToHex } from '../../utils';

/**
 * Boards for game test. Each board is an array of length 15. Divisible into 3 sets of 5 where
 * index 0 is x-coord, 1 is y-coord, and 2 is orientation (horizontal / vertical, 0 / 1)
 */
export const boards: { [key: string]: number[] } = {
    alice: [
        0, 0, 0,
        0, 1, 0,
        0, 2, 0,
        0, 3, 0,
        0, 4, 0
    ],
    bob: [
        1, 0, 0,
        1, 1, 0,
        1, 2, 0,
        1, 3, 0,
        1, 4, 0
    ]
}

// Shots to play out in game test
export const shots: { [key: string]: number[][] } = {
    alice: [
        [1, 0], [2, 0], [3, 0], [4, 0], [5, 0],
        [1, 1], [2, 1], [3, 1], [4, 1],
        [1, 2], [2, 2], [3, 2],
        [1, 3], [2, 3], [3, 3],
        [1, 4], [2, 4]
    ],
    bob: [
        [9, 9], [9, 8], [9, 7], [9, 6], [9, 5],
        [9, 4], [9, 3], [9, 2], [9, 1],
        [9, 0], [8, 9], [8, 8],
        [8, 7], [8, 6], [8, 5],
        [8, 4]
    ]
}

/**
 * 
 * @param {BarretenbergWasm} barretenberg Aztec typescript package to utilize many cryptographic
 * @param  {string} forwarder Address of a forwarder contract
 * @return { [key: string]: string } boardHashes - Pedersen hashes of Alice's and Bob's boards for the purpose of integrity
 * @return { Contract } bv - Board verifier contract
 * @return { Contract } game - BattleshipGame contract
 * @return { SinglePedersen } pedersen - Aztec pedersen class 
 * @return { Contract } sv - Shot verifier contract
 */
export const initialize = async (barretenberg: BarretenbergWasm, forwarder: string) => {

    // Deploy verifier contracts
    const svFactory = await ethers.getContractFactory('ShotVerifier')
    const sv = await svFactory.deploy()
    console.log('1 / 4 contracts deployed. ShotVerifier deployed to: ', sv.address);


    const bvFactory = await ethers.getContractFactory('BoardVerifier')
    const bv = await bvFactory.deploy()
    console.log('2 / 4 contracts deployed. BoardVerifier deployed to: ', bv.address);

    // Initialize trusted forwarder
    let forwarderContract;
    if (forwarder === ethers.constants.AddressZero) {
        const forwarderFactory = await ethers.getContractFactory('Forwarder');
        forwarderContract = await forwarderFactory.deploy();
        console.log('3 / 4 contracts deployed. Forwarder deployed to: ', forwarderContract.address);
    } else {
        forwarderContract = await (await ethers.getContractFactory('Forwarder')).attach(forwarder)
    }

    // Deploy new Battleship Game
    const gameFactory = await ethers.getContractFactory('BattleshipGame')
    const game = await gameFactory.deploy(forwarderContract.address, bv.address, sv.address)
    console.log('4 / 4 contracts deployed. BattleshipGame deployed to: ', game.address);

    // Create new single pedersen instance to hash boards
    const pedersen = new SinglePedersen(barretenberg);

    // Convert boards as number arrays to buffer arrays to compress into Pedersen hash buffer
    const alicePedersen = pedersen.compressInputs(boards.alice.map(coord => Buffer.from(numToHex(coord), 'hex')));
    const bobPedersen = pedersen.compressInputs(boards.bob.map(coord => Buffer.from(numToHex(coord), 'hex')));

    // Convert hash buffer to hex string
    const boardHashes = {
        alice: `0x${alicePedersen.toString('hex')}`,
        bob: `0x${bobPedersen.toString('hex')}`
    }
    return { boardHashes, bv, game, pedersen, sv }
}