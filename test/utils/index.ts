import { BarretenbergWasm } from '@noir-lang/barretenberg/dest/wasm';
import { SinglePedersen } from '@noir-lang/barretenberg/dest/crypto';
import { ethers } from 'hardhat';
import { numToHex } from '../../utils';

// x, y, z (horizontal/ verical orientation) ship placements
export const boards = {
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

// shots alice to hit / bob to miss
export const shots = {
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

export const initialize = async (barretenberg: BarretenbergWasm, forwarder) => {
    // deploy verifiers
    const svFactory = await ethers.getContractFactory('ShotVerifier')
    const sv = await svFactory.deploy()
    const bvFactory = await ethers.getContractFactory('BoardVerifier')
    const bv = await bvFactory.deploy()
    // initialize trusted forwarder
    if (forwarder === ethers.constants.AddressZero) {
        const forwarderFactory = await ethers.getContractFactory('Forwarder');
        forwarder = await forwarderFactory.deploy();
    } else {
        forwarder = await (await ethers.getContractFactory('Forwarder')).attach(forwarder)
    }
    // deploy game
    const gameFactory = await ethers.getContractFactory('BattleshipGame')
    const game = await gameFactory.deploy(forwarder.address, bv.address, sv.address)
    // instantiate mimc sponge on bn254 curve + store ffjavascript obj reference
    const pedersen = new SinglePedersen(barretenberg);
    // store board hashes for quick use
    const boardHashes = {
        alice: pedersen.compressInputs(boards.alice.map(coord => Buffer.from(numToHex(coord), 'hex'))),
        bob: pedersen.compressInputs(boards.bob.map(coord => Buffer.from(numToHex(coord), 'hex')))
    }
    return { boardHashes, bv, forwarder, game, pedersen, sv }
}