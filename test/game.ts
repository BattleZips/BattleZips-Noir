import {
    BarretenbergWasm,
    create_proof,
    setup_generic_prover_and_verifier,
    verify_proof,
} from '@noir-lang/barretenberg';
import { compile } from '@noir-lang/noir_wasm';
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { resolve } from 'path';
import { boards, initialize, shots } from './utils';
import { generateAcirFromNargo, printLog } from '../utils';

describe('Play entire BattleZip game', async () => {
    let alice, bob; // Players
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

        // Shot is proved to be a miss
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
        [alice, bob] = await ethers.getSigners();

        // Initialize contracts and Aztec backend
        ({ boardHashes, game, } = await initialize(barretenberg, ethers.constants.AddressZero))

        // Create prover and verifier for board and shot proofs
        // boardAcir = compile(resolve(__dirname, '../circuits/board/src/main.nr')).circuit; // typescript compilation
        boardAcir = generateAcirFromNargo('board'); // nargo compilation
        [boardProver, boardVerifier] = await setup_generic_prover_and_verifier(boardAcir);
        // shotAcir = compile(resolve(__dirname, '../circuits/shot/src/main.nr')).circuit; // typescript compilation
        shotAcir = generateAcirFromNargo('shot'); // nargo compilation
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

        it('Confirm both players have joined the same game', async () => {
            const gameIdAlice = await (await game.connect(alice)).playing(alice.address);
            expect(gameIdAlice).to.equal(1);
            const gameIdBob = await (await game.connect(bob)).playing(bob.address);
            expect(gameIdBob).to.equal(1);
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

        it('Confirm both players have exited game and can create / join another', async () => {
            const gameIdAlice = await (await game.connect(alice)).playing(alice.address);
            expect(gameIdAlice).to.equal(0);
            const gameIdBob = await (await game.connect(bob)).playing(bob.address);
            expect(gameIdBob).to.equal(0);
        });
    });


    describe("Test forfeit functionality", () => {
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
                2,
                boardHashes.bob,
                proof
            )).wait()
        });

        it("opening shot", async () => {
            // Alice takes first turn in game with opening shot. No proof needed
            await (await game.connect(alice).firstTurn(2, [1, 0])).wait()
        });

        it("Forfeit as Alice after first shot, confirm game winner", async () => {
            // Alice leaves game
            await (await game.connect(alice).leaveGame(2)).wait();
            // Grab game state from the contract. Winner is the fourth value
            const gameState = await game.gameState(2);
            // Bob should be the winner
            expect(gameState[5]).to.equal(bob.address);
        });

        it('Confirm both players have exited game', async () => {
            // Access public mapping to determine whether Alice's address maps to a 0
            // 0 indicates no game is being played by that address
            const gameIdAlice = await (await game.connect(alice)).playing(alice.address);
            expect(gameIdAlice).to.equal(0);
            // Check "playing" mapping for Bob
            const gameIdBob = await (await game.connect(bob)).playing(bob.address);
            expect(gameIdBob).to.equal(0);
        });
    })

    describe("Test leaving game that has not been started", () => {
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

        it("Leave game prior to taking a shot, confirm no longer in game", async () => {
            // Leave game as Alice without Bob having joined
            await (await game.connect(alice).leaveGame(3)).wait();
            const gameIdAlice = await (await game.connect(alice)).playing(alice.address);
            // Alice should be removed from the game without another player having joined
            expect(gameIdAlice).to.equal(0);
        });
    });

    describe("Test shot uniqueness", () => {
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
                4,
                boardHashes.bob,
                proof
            )).wait()
        });

        it("opening shot", async () => {
            // Alice takes first turn in game with opening shot. No proof needed
            await (await game.connect(alice).firstTurn(4, [1, 0])).wait()
        });

        it("Bob shot successful: [8, 9]", async () => {
            let abi = {
                hash: boardHashes.alice,
                hit: 0,
                ships: boards.alice,
                shot: [8, 9],
            }

            // Create proof of shot
            let proof = await create_proof(shotProver, shotAcir, abi);
            // Verify shot proof locally
            await verify_proof(shotVerifier, proof);

            // Prove alice's registered shot hit, and register bob's next shot
            expect((await game.connect(bob).turn(
                4, // Game id
                false, // Hit bool
                [8, 9], // Returning fire / next shot to register (not part of proof)
                proof
            )).wait()).to.not.be.reverted;
        });

        it("Alice shot successful: [7, 7]", async () => {
            let abi = {
                hash: boardHashes.bob,
                hit: 0,
                ships: boards.bob,
                shot: [7, 7],
            }

            // Create proof of shot
            let proof = await create_proof(shotProver, shotAcir, abi);
            // Verify shot proof locally
            await verify_proof(shotVerifier, proof);

            // Prove alice's registered shot hit, and register bob's next shot
            expect((await game.connect(alice).turn(
                4, // Game id
                false, // Hit bool
                [7, 7], // Returning fire / next shot to register (not part of proof)
                proof
            )).wait()).to.not.be.reverted;
        });

        it("Bob shot successful: [8, 8]", async () => {
            let abi = {
                hash: boardHashes.alice,
                hit: 0,
                ships: boards.alice,
                shot: [8, 8],
            }

            // Create proof of shot
            let proof = await create_proof(shotProver, shotAcir, abi);
            // Verify shot proof locally
            await verify_proof(shotVerifier, proof);

            // Prove alice's registered shot hit, and register bob's next shot
            expect((await game.connect(bob).turn(
                4, // Game id
                false, // Hit bool
                [8, 8], // Returning fire / next shot to register (not part of proof)
                proof
            )).wait()).to.not.be.reverted;
        });

        it("Alice shot successful: [7, 8]", async () => {
            let abi = {
                hash: boardHashes.bob,
                hit: 0,
                ships: boards.bob,
                shot: [7, 8],
            }

            // Create proof of shot
            let proof = await create_proof(shotProver, shotAcir, abi);
            // Verify shot proof locally
            await verify_proof(shotVerifier, proof);

            // Prove alice's registered shot hit, and register bob's next shot
            expect((await game.connect(alice).turn(
                4, // Game id
                false, // Hit bool
                [7, 8], // Returning fire / next shot to register (not part of proof)
                proof
            )).wait()).to.not.be.reverted;
        });

        it("Bob shot duplicate failure: [8, 9]", async () => {
            let abi = {
                hash: boardHashes.alice,
                hit: 0,
                ships: boards.alice,
                shot: [8, 9],
            }

            // Create proof of shot
            let proof = await create_proof(shotProver, shotAcir, abi);
            // Verify shot proof locally
            await verify_proof(shotVerifier, proof);

            // Prove alice's registered shot hit, and register bob's next shot
            expect(game.connect(bob).turn(
                4, // Game id
                false, // Hit bool
                [8, 9], // Returning fire / next shot to register (not part of proof)
                proof
            )).to.be.revertedWith('Shot already taken!');
        });

        it("Bob shot successful: [8, 7]", async () => {
            let abi = {
                hash: boardHashes.alice,
                hit: 0,
                ships: boards.alice,
                shot: [8, 7],
            }

            // Create proof of shot
            let proof = await create_proof(shotProver, shotAcir, abi);
            // Verify shot proof locally
            await verify_proof(shotVerifier, proof);

            // Prove alice's registered shot hit, and register bob's next shot
            expect((await game.connect(bob).turn(
                4, // Game id
                false, // Hit bool
                [8, 7], // Returning fire / next shot to register (not part of proof)
                proof
            )).wait()).to.not.be.reverted;
        });

        it("Alice shot duplicate failure: [7, 7]", async () => {
            let abi = {
                hash: boardHashes.bob,
                hit: 0,
                ships: boards.bob,
                shot: [7, 7],
            }

            // Create proof of shot
            let proof = await create_proof(shotProver, shotAcir, abi);
            // Verify shot proof locally
            await verify_proof(shotVerifier, proof);

            // Prove alice's registered shot hit, and register bob's next shot
            expect(game.connect(alice).turn(
                4, // Game id
                false, // Hit bool
                [7, 7], // Returning fire / next shot to register (not part of proof)
                proof
            )).to.be.revertedWith('Shot already taken!');
        });

    });
});