import { compile, acir_to_bytes } from '@noir-lang/noir_wasm';
import { getCircuitSize } from '@noir-lang/barretenberg/dest/client_proofs/generic_proof/standard_example_prover';
import { serialise_acir_to_barrtenberg_circuit } from '@noir-lang/aztec_backend';
import { BarretenbergWasm } from '@noir-lang/barretenberg/dest/wasm';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from 'path';

const PROOFS = ['board', 'shot'];

const FRONTEND_PATH = resolve(__dirname, '../deploy/frontend');

const WASM_PATHS = [
    {
        dep: 'aztec_backend',
        file: 'aztec_backend_bg.wasm',
        path: 'node_modules/@noir-lang/aztec_backend/aztec_backend_bg.wasm',
    },
    {
        dep: 'barretenberg',
        file: 'barretenberg.wasm',
        path: 'node_modules/@noir-lang/barretenberg/src/wasm/barretenberg.wasm'
    },
    {
        dep: 'noir_wasm',
        file: 'noir_wasm_bg.wasm',
        path: 'node_modules/@noir-lang/noir_wasm/noir_wasm_bg.wasm'
    }
];

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

        // Check if frontend directory exists, if not then create
        if (!existsSync(FRONTEND_PATH)) {
            mkdirSync(FRONTEND_PATH);
        };

        // Write circuit file
        writeFileSync(
            resolve(__dirname, `../deploy/frontend/${proof}Circuit.buf`),
            Buffer.from(serialised_circuit)
        );

        // Write acir file
        writeFileSync(
            resolve(__dirname, `../deploy/frontend/${proof}Acir.buf`),
            Buffer.from(acir_to_bytes(acir))
        );
    }
    // Copy wasm files from node_modules
    WASM_PATHS.forEach(({ dep, file, path }) => {
        console.log('Locating web assembly file for: ', dep);
        if (existsSync(path)) {
            copyFileSync(path, `${FRONTEND_PATH}/${file}`);
        } else {
            console.log('Could not locate wasm file for: ', dep);
        }

    })
    process.exit(0);
})();