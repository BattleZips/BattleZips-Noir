import { compile, acir_from_bytes } from '@noir-lang/noir_wasm';
import { setup_generic_prover_and_verifier } from '@noir-lang/barretenberg/dest/client_proofs';
import { writeFileSync } from 'fs';
import path, { resolve, join } from 'path';
import { pathToUint8Array } from '../utils';

/**
 * Array of circuits containing the contract name for the circuit, subdirectory within circuits, and name
 */
const CIRCUITS = [
    { contract: 'BoardVerifier', dir: 'board', name: 'Board' },
    { contract: 'ShotVerifier', dir: 'shot', name: 'Shot' }
]

/**
 * Loop through all circuits and generate each verifier contract sequentially. Verifier must be generated from
 * acir before verifier contract can be generated
 */
async function generateVerifierContracts() {
    for (const circuit of CIRCUITS) {
        let acir;
        // Try to generate acir from typescript compilation. If error then read directly from pre-existing acir file
        try {
            // Compile circuit in typescript
            let compiled_program = compile(resolve(__dirname, `../circuits/${circuit.dir}/src/main.nr`));
            acir = compiled_program.circuit;
        } catch (e: any) {
            // Read from pre-existing acir file
            let acirByteArray = pathToUint8Array(path.resolve(__dirname, `../circuits/${circuit.dir}/build/${process.argv[2]}.acir`));
            acir = acir_from_bytes(acirByteArray);
        }
        console.log(`Setting up generic verifier for ${circuit.name} proof...`);
        let [_, verifier] = await setup_generic_prover_and_verifier(acir);

        // Verifier contracts are all generated with initial name of "TurboVerifier". 
        // Replace auto generated name with <circuit_name>Verifer
        const sc = verifier.SmartContract().replace('TurboVerifier', circuit.contract);
        syncWriteFile(`../contracts/${circuit.contract}.sol`, sc);

        console.log(`Done writing ${circuit.name} Verifier contract.`);
    }
}
/**
 * Helper function to syncronously write data to file
 * 
 * @param {string} filename - desired name of file
 * @param {any} data - arbitray date to write to file 
 */
const syncWriteFile = (filename: string, data: any) => {
    writeFileSync(join(__dirname, filename), data, {
        flag: 'w',
    });
}

generateVerifierContracts().then(() => process.exit(0)).catch(console.log);
