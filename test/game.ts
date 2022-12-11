import { BarretenbergWasm } from '@noir-lang/barretenberg/dest/wasm';
import {
    create_proof,
    setup_generic_prover_and_verifier,
    verify_proof,
} from '@noir-lang/barretenberg/dest/client_proofs';
import { compile } from '@noir-lang/noir_wasm';
import { ethers } from 'hardhat';
import { resolve } from 'path';
import { boards, initialize, printLog, shots } from './utils';

describe('Play entire BattleZip game', async () => {
    let alice, bob, operator; // Players
    let barretenberg; // Instance of Aztec Barretenberg
    let boardAcir, boardProver, boardVerifier; // Materials related to proving and verifying board proof
    let boardHashes // Store hashed board for alice and bob
    let game; // Battleship Game contract
    let shotAcir, shotProver, shotVerifier; // Materials related to proving and verifying shot proof

    /**
     * Helper function to carry out turns in the Battleship game
     * 
     * @param aliceNonce Representation of what the current turn in the game is
     */
    async function simulateTurn(aliceNonce) {
        printLog(`Bob reporting result of Alice shot #${aliceNonce - 1} (Turn ${aliceNonce * 2 - 1})`)

        // Create shot input for shot proof
        let abi = {
            hash: boardHashes.bob,
            hit: 1,
            ships: boards.bob,
            shot: shots.alice[aliceNonce - 1],
        }

        // Create proof of shot
        let proof = await create_proof(shotProver, shotAcir, abi);
        // Verify shot proof locally
        await verify_proof(shotVerifier, proof);

        // Prove alice's registered shot hit, and register bob's next shot
        await (await game.connect(bob).turn(
            1, // Game id
            true, // Hit bool
            shots.bob[aliceNonce - 1], // Returning fire / next shot to register (not part of proof)
            proof
        )).wait()

        /// Shot is proved to be a miss ///
        printLog(`Alice reporting result of Bob shot #${aliceNonce - 1} (Turn ${aliceNonce * 2})`)

        // Bob's shot proof abi
        abi = {
            hash: boardHashes.alice,
            hit: 0,
            ships: boards.alice,
            shot: shots.bob[aliceNonce - 1],
        };

        // Create proof for Bob's shot
        proof = await create_proof(shotProver, shotAcir, abi);
        // Verify proof of Bob's shot locally
        await verify_proof(shotVerifier, proof);

        // Prove Bob's registered shot missed, and register alice's next shot
        await (await game.connect(alice).turn(
            1, // Game id
            false, // Hit bool
            shots.alice[aliceNonce], // Returning fire / next shot to register (not part of proof)
            proof
        )).wait()
    }

    before(async () => {

        // Initialize barretenberg
        barretenberg = await BarretenbergWasm.new();

        // Set players
        const signers = await ethers.getSigners()
        operator = signers[0];
        alice = signers[1];
        bob = signers[2];

        // Initialize contracts and Aztec backend
        ({ boardHashes, game, } = await initialize(barretenberg, ethers.constants.AddressZero))

        // Create prover and verifier for board and shot proofs
        boardAcir = compile(resolve(__dirname, '../circuits/board/src/main.nr')).circuit;
        [boardProver, boardVerifier] = await setup_generic_prover_and_verifier(boardAcir);
        shotAcir = compile(resolve(__dirname, '../circuits/shot/src/main.nr')).circuit;
        [shotProver, shotVerifier] = await setup_generic_prover_and_verifier(shotAcir);
    });

    describe("Play game to completion", async () => {
        it("Start a new game", async () => {

            // Create board inputs for Alice's board proof
            const abi = {
                hash: boardHashes.alice,
                ships: boards.alice,
            };

            // Generate board proof for Alice
            const proof = await create_proof(boardProver, boardAcir, abi);
            // Verify board proof locally
            await verify_proof(boardVerifier, proof);

            console.log('Starting new game...');
            // Create new Battleship Game with Alice's board proof
            await (await game.connect(alice).newGame(boardHashes.alice, proof)).wait();
            console.log('New Battleship game started.');
        });

        it("Join an existing game", async () => {
            // Create board inputs for Bob's board proof
            const abi = {
                hash: boardHashes.bob,
                ships: boards.bob,
            }
            // Compute witness and run through groth16 circuit for proof / signals
            const proof = await create_proof(boardProver, boardAcir, abi);

            // Verify proof locally
            await verify_proof(boardVerifier, proof);


            // Prove on-chain hash is of valid board configuration for Bob
            await (await game.connect(bob).joinGame(
                1,
                boardHashes.bob,
                proof
            )).wait()
        });

        it("opening shot", async () => {
            // Alice takes first turn in game with opening shot. No proof needed
            await (await game.connect(alice).firstTurn(1, [1, 0])).wait()
        });

        it('Prove hit/ miss for 32 turns', async () => {
            // Play out game with a move made for Alice and Bob each loop iteration
            for (let i = 1; i <= 16; i++) {
                await simulateTurn(i)
            }
        });

        it('Alice wins on sinking all of Bob\'s ships', async () => {

            // Bob's shot hit/miss integrity proof public / private inputs
            const abi = {
                hash: boardHashes.bob,
                hit: 1,
                ships: boards.bob,
                shot: shots.alice[16],
            }
            // Create proof for final shot in game
            const proof = await create_proof(shotProver, shotAcir, abi);

            // Verify proof locally
            await verify_proof(shotVerifier, proof);

            // Prove Alice's registered shot hit, and register Bob's next shot
            await (await game.connect(bob).turn(
                1, // Game id
                true, // Hit bool
                [0, 0], // Shot params are ignored on reporting all ships sunk, can be any uint256
                proof
            )).wait()
        })
    });
});