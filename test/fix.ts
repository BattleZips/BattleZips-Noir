// import { BarretenbergWasm } from '@noir-lang/barretenberg/dest/wasm';
// import {
//     create_proof,
//     setup_generic_prover_and_verifier,
//     verify_proof,
// } from '@noir-lang/barretenberg/dest/client_proofs';
// import { compile } from '@noir-lang/noir_wasm';
// import { ethers } from 'hardhat';
// import { expect } from 'chai';
// import { resolve } from 'path';
// import { boards, initialize, shots } from './utils';
// import { printLog } from '../utils';
// import { SinglePedersen } from '@noir-lang/barretenberg/dest/crypto';
// import { numToHex } from '../utils';



// describe('Play entire BattleZip game', async () => {
//     let contract; // Test contract
//     let player; // Player address
//     let barretenberg; // Instance of Aztec Barretenberg
//     let pedersen; // pedersen
//     let boardAcir, boardProver, boardVerifier; // Materials related to proving and verifying board proof
//     let shotAcir, shotProver, shotVerifier; // Materials related to proving and verifying shot proof

//     before(async () => {
//         // Initialize barretenberg
//         barretenberg = await BarretenbergWasm.new();

//         // Initialize pedersen
//         pedersen = new SinglePedersen(barretenberg);

//         // Set players
//         [player] = await ethers.getSigners();

//         // Initialize contracts 
//         const svFactory = await ethers.getContractFactory('ShotVerifier')
//         const sv = await svFactory.deploy()
//         const bvFactory = await ethers.getContractFactory('BoardVerifier')
//         const bv = await bvFactory.deploy()
//         const testFactory = await ethers.getContractFactory('PublicInputTest')
//         contract = await testFactory.deploy(bv.address, sv.address)

//         // Create prover and verifier for board and shot proofs
//         boardAcir = compile(resolve(__dirname, '../circuits/board/src/main.nr')).circuit;
//         [boardProver, boardVerifier] = await setup_generic_prover_and_verifier(boardAcir);
//         shotAcir = compile(resolve(__dirname, '../circuits/shot/src/main.nr')).circuit;
//         [shotProver, shotVerifier] = await setup_generic_prover_and_verifier(shotAcir);
//     });

//     describe("Play game to completion", async () => {
//         xit("Start a new game", async () => {
//             // build hash
//             let board = boards.alice;
//             const hash = pedersen.compressInputs(board.map(coord => Buffer.from(numToHex(coord), 'hex')));
//             const hex_hash = `0x${hash.toString('hex')}`
//             // Create board inputs for Alice's board proof
//             const abi = {
//                 hash: hex_hash,
//                 ships: board,
//             };

//             // Generate board proof for Alice
//             console.log("board: ", board);
//             console.log("hash: ", hex_hash)
//             const proof = await create_proof(boardProver, boardAcir, abi);
//             console.log("pp", proof.length)

//             // verify the existence of the public input (board hash)
//             let pub_input = proof.slice(0, 32);
//             // let board_hash = Buffer.from(hex_hash.slice(2), "hex");
//             expect(pub_input).to.be.deep.equal(hash);

//             // extract the board commitment
//             let commitment = await contract.extractPublicInput(proof, 0);
//             console.log("qq: ", commitment);
//             // Verify board proof locally
//             // await verify_proof(boardVerifier, proof);

//             // console.log('Starting new game...');
//             // Create new Battleship Game with Alice's board proof
//             // await (await contract.connect(player).newGame(hash, proof)).wait();
//             // console.log('New Battleship game started.');
//         });
//         it("Start a new game", async () => {
//             // build hash
//             let board = boards.alice;
//             const hash = pedersen.compressInputs(board.map(coord => Buffer.from(numToHex(coord), 'hex')));
//             const hex_hash = `0x${hash.toString('hex')}`
//             // Create board inputs for Alice's board proof

//             let abi = {
//                 hash: hex_hash,
//                 hit: 1,
//                 ships: board,
//                 shot: [0, 0],
//             }

//             // Generate board proof for Alice
//             let proof = await create_proof(shotProver, shotAcir, abi);

//             // verify the existence of the public input (board hash)
//             let pub_input = [
//                 proof.slice(0, 32),
//                 proof.slice(32, 64),
//                 proof.slice(64, 96),
//                 proof.slice(96, 128),
//             ];

//             // 
//             let out = await contract.shotPublicInputs(proof);
//             console.log("OUT: ", out);

//             // // let board_hash = Buffer.from(hex_hash.slice(2), "hex");
//             // expect(pub_input).to.be.deep.equal(hash);

//             // // extract the board commitment
//             // let commitment = await contract.extractPublicInput(proof, 0);
//             // console.log("qq: ", commitment);
//             // Verify board proof locally
//             // await verify_proof(boardVerifier, proof);

//             // console.log('Starting new game...');
//             // Create new Battleship Game with Alice's board proof
//             // await (await contract.connect(player).newGame(hash, proof)).wait();
//             // console.log('New Battleship game started.');
//         });
//     });
// });