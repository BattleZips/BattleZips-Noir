import { BarretenbergWasm } from '@noir-lang/barretenberg/dest/wasm';
import {
    create_proof,
    setup_generic_prover_and_verifier,
    verify_proof,
} from '@noir-lang/barretenberg/dest/client_proofs';
import { compile } from '@noir-lang/noir_wasm';
import { ethers } from 'hardhat';
import { resolve } from 'path';
import { boards, initialize } from './utils';

describe('Play entire BattleZip game', async () => {
    let alice, bob, operator; // players
    let barretenberg;
    let boardAcir;
    let boardHashes // store hashed board for alice and bob
    let boardProver;
    let boardVerifier;
    let game; // contracts
    let shotProver;
    let shotVerifier;

    // async function simulateTurn(aliceNonce) {
    //     console.log(`Bob reporting result of Alice shot #${aliceNonce - 1} (Turn ${aliceNonce * 2 - 1})`)


    //     let input = {
    //         ships: boards.bob,
    //         hash: F.toObject(boardHashes.bob),
    //         shot: shots.alice[aliceNonce - 1],
    //         hit: 1,
    //     }
    //     // compute witness and run through groth16 circuit for proof / signals
    //     let { proof, publicSignals } = await snarkjs.groth16.fullProve(
    //         input,
    //         'zk/shot_js/shot.wasm',
    //         'zk/zkey/shot_final.zkey'
    //     )
    //     // verify proof locally
    //     await snarkjs.groth16.verify(verificationKeys.shot, publicSignals, proof)
    //     // prove alice's registered shot hit, and register bob's next shot
    //     let proofArgs = buildProofArgs(proof)
    //     tx = await (await game.connect(bob).turn(
    //         1, // game id
    //         true, // hit bool
    //         shots.bob[aliceNonce - 1], // returning fire / next shot to register (not part of proof)
    //         ...proofArgs //pi_a, pi_b_0, pi_b_1, pi_c
    //     )).wait()
    //     /// ALICE PROVES BOB PREV REGISTERED SHOT MISSED ///
    //     printLog(`Alice reporting result of Bob shot #${aliceNonce - 1} (Turn ${aliceNonce * 2})`)
    //     // bob's shot hit/miss integrity proof public / private inputs
    //     input = {
    //         ships: boards.alice,
    //         hash: F.toObject(boardHashes.alice),
    //         shot: shots.bob[aliceNonce - 1],
    //         hit: 0
    //     };
    //     // compute witness and run through groth16 circuit for proof / signals
    //     ({ proof, publicSignals } = await snarkjs.groth16.fullProve(
    //         input,
    //         'zk/shot_js/shot.wasm',
    //         'zk/zkey/shot_final.zkey'
    //     ));
    //     // verify proof locally
    //     await snarkjs.groth16.verify(verificationKeys.shot, publicSignals, proof)
    //     // prove bob's registered shot missed, and register alice's next shot
    //     proofArgs = buildProofArgs(proof)
    //     await (await game.connect(alice).turn(
    //         1, // game id
    //         false, // hit bool
    //         shots.alice[aliceNonce], // returning fire / next shot to register (not part of proof)
    //         ...proofArgs //pi_a, pi_b_0, pi_b_1, pi_c
    //     )).wait()
    // }

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
        let { circuit: boardAcir } = compile(resolve(__dirname, '../circuits/board/src/main.nr'));
        [boardProver, boardVerifier] = await setup_generic_prover_and_verifier(boardAcir);
    });

    describe("Play game to completion", async () => {
        it("Start a new game", async () => {

            // board starting verification proof public / private inputs
            const abi = {
                ships: boards.alice,
                hash: `0x${boardHashes.alice.toString('hex')}`
            };

            // Compute witness and generate proof
            const proof = await create_proof(boardProver, boardAcir, abi);
            const verified = await verify_proof(boardVerifier, proof);
            console.log('Proof: ', abi);
        });
    });
});