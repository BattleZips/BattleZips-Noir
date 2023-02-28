import { acir_write_bytes } from '@noir-lang/noir_wasm';
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from 'path';
import { generateAcirFromNargo } from '../utils';

const PROOFS = ['board', 'shot'];

const DEPLOY_PATH = resolve(__dirname, '../deploy');
const FRONTEND_PATH = resolve(__dirname, '../deploy/frontend');

/**
 * Script to generate the necessary files to generate Noir proofs in the frontend of a React application.
 * The acir of the circuit must be turned into a buffer to be read on the frontend 
 */
(async () => {
    for (const proof of PROOFS) {

        // Compile with Typescript

        // const compiled_program = compile(`${pathToCircuitDir}/src/main.nr`);
        // acir = compiled_program.circuit;

        // Grab acir from nargo compilation
        const acir = generateAcirFromNargo(proof);

        // Check if frontend directory exists, if not then create
        if (!existsSync(FRONTEND_PATH)) {
            // If it doesn't exist check deploy path first
            if (!existsSync(DEPLOY_PATH)) {
                mkdirSync(DEPLOY_PATH);
            }
            mkdirSync(FRONTEND_PATH);
        };

        // Write acir file
        writeFileSync(
            resolve(__dirname, `../deploy/frontend/${proof}Acir.buf`),
            Buffer.from(acir_write_bytes(acir))
        );
    }
    process.exit(0);
})();