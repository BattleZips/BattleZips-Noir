import { compile, acir_to_bytes } from '@noir-lang/noir_wasm';
import { getCircuitSize } from '@noir-lang/barretenberg/dest/client_proofs/generic_proof/standard_example_prover';
import { serialise_acir_to_barrtenberg_circuit } from '@noir-lang/aztec_backend';
import { BarretenbergWasm } from '@noir-lang/barretenberg/dest/wasm';
import { writeFileSync } from "fs";
import { resolve } from 'path';

const PROOFS = ['board', 'shot'];

/**
 * Script to generate the necessary files to generate Noir proofs in the frontend of a React application.
 * The circuit and accompanying acir of the circuit must be turned into a buffer to be read on the frontend 
 */
(async () => {
    for (const proof of PROOFS) {
        const compiled_program = compile(
            resolve(__dirname, `../circuits/${proof}/src/main.nr`)
        );

        const acir = compiled_program.circuit;

        const serialised_circuit = serialise_acir_to_barrtenberg_circuit(acir);
        const barretenberg = await BarretenbergWasm.new();
        // Circuit size must be known on the frontend to be able to successfully generate proofs
        const circSize = await getCircuitSize(barretenberg, serialised_circuit);
        console.log('Circuit size: ', circSize);

        writeFileSync(
            resolve(__dirname, `../deploy/${proof}Circuit.buf`),
            Buffer.from(serialised_circuit)
        );

        writeFileSync(
            resolve(__dirname, `../deploy/${proof}Acir.buf`),
            Buffer.from(acir_to_bytes(acir))
        );
    }
    process.exit(0);
})();