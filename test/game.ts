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
    let alice, bob, operator; // players
    let barretenberg;
    let boardAcir, boardProver, boardVerifier;
    let boardHashes // store hashed board for alice and bob
    let game; // contracts
    let shotAcir, shotProver, shotVerifier;

    async function simulateTurn(aliceNonce) {
        printLog(`Bob reporting result of Alice shot #${aliceNonce - 1} (Turn ${aliceNonce * 2 - 1})`)


        let abi = {
            hash: boardHashes.bob,
            hit: 1,
            ships: boards.bob,
            shot: shots.alice[aliceNonce - 1],
        }
        // compute witness and run through groth16 circuit for proof / signals
        let proof = await create_proof(shotProver, shotAcir, abi);
        // verify proof locally
        await verify_proof(shotVerifier, proof);
        // prove alice's registered shot hit, and register bob's next shot
        await (await game.connect(bob).turn(
            1, // game id
            true, // hit bool
            shots.bob[aliceNonce - 1], // returning fire / next shot to register (not part of proof)
            proof
        )).wait()
        /// ALICE PROVES BOB PREV REGISTERED SHOT MISSED ///
        printLog(`Alice reporting result of Bob shot #${aliceNonce - 1} (Turn ${aliceNonce * 2})`)
        // bob's shot hit/miss integrity proof public / private inputs
        abi = {
            hash: boardHashes.alice,
            hit: 0,
            ships: boards.alice,
            shot: shots.bob[aliceNonce - 1],
        };
        // compute witness and run through groth16 circuit for proof / signals
        proof = await create_proof(shotProver, shotAcir, abi);
        await verify_proof(shotVerifier, proof);
        // verify proof locally
        // prove bob's registered shot missed, and register alice's next shot
        await (await game.connect(alice).turn(
            1, // game id
            false, // hit bool
            shots.alice[aliceNonce], // returning fire / next shot to register (not part of proof)
            proof
        )).wait()
    }

    before(async () => {

        // Initialize barretenberg
        barretenberg = await BarretenbergWasm.new();
        // set players
        const signers = await ethers.getSigners()
        operator = signers[0];
        alice = signers[1];
        bob = signers[2];
        // initialize and store 
        ({ boardHashes, game, } = await initialize(barretenberg, ethers.constants.AddressZero))
        boardAcir = compile(resolve(__dirname, '../circuits/board/src/main.nr')).circuit;
        [boardProver, boardVerifier] = await setup_generic_prover_and_verifier(boardAcir);
        shotAcir = compile(resolve(__dirname, '../circuits/shot/src/main.nr')).circuit;
        [shotProver, shotVerifier] = await setup_generic_prover_and_verifier(shotAcir);
    });

    describe("Play game to completion", async () => {
        it("Start a new game", async () => {

            // board starting verification proof public / private inputs
            const abi = {
                hash: boardHashes.alice,
                ships: boards.alice,
            };

            // Compute witness and generate proof
            const proof = await create_proof(boardProver, boardAcir, abi);
            await verify_proof(boardVerifier, proof);

            console.log('Starting new game...');
            await (await game.connect(alice).newGame(boardHashes.alice, proof)).wait();
            console.log('New Battleship game started.');
        });

        it("Join an existing game", async () => {
            // board starting verification proof public / private inputs
            const abi = {
                hash: boardHashes.bob,
                ships: boards.bob,
            }
            // compute witness and run through groth16 circuit for proof / signals
            const proof = await create_proof(boardProver, boardAcir, abi);

            // verify proof locally
            await verify_proof(boardVerifier, proof);


            // prove on-chain hash is of valid board configuration
            await (await game.connect(bob).joinGame(
                1,
                boardHashes.bob,
                proof
            )).wait()
        });

        it("opening shot", async () => {
            await (await game.connect(alice).firstTurn(1, [1, 0])).wait()
        });

        it('Prove hit/ miss for 32 turns', async () => {
            for (let i = 1; i <= 16; i++) {
                await simulateTurn(i)
            }
        });

        it('Alice wins on sinking all of Bob\'s ships', async () => {
            // bob's shot hit/miss integrity proof public / private inputs
            const abi = {
                hash: boardHashes.bob,
                hit: 1,
                ships: boards.bob,
                shot: shots.alice[16],
            }
            // compute witness and run through groth16 circuit for proof / signals
            const proof = await create_proof(shotProver, shotAcir, abi);
            // verify proof locally
            await verify_proof(shotVerifier, proof);
            // prove alice's registered shot hit, and register bob's next shot
            await (await game.connect(bob).turn(
                1, // game id
                true, // hit bool
                [0, 0], // shot params are ignored on reporting all ships sunk, can be any uint256
                proof
            )).wait()
        })
    });
});