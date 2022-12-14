import { resolve, join } from 'path';
import { compile, acir_from_bytes } from '@noir-lang/noir_wasm';
import { setup_generic_prover_and_verifier } from '@noir-lang/barretenberg/dest/client_proofs';
import { writeFileSync } from 'fs';
import path from 'path';
import { pathToUint8Array } from '../utils';

const CIRCUITS = [
    { contract: 'BoardVerifier', dir: 'board', name: 'Board' },
    { contract: 'ShotVerifier', dir: 'shot', name: 'Shot' }
]

async function generateVerifierContracts() {
    for (const circuit of CIRCUITS) {
        let acir;
        try {
            let compiled_program = compile(resolve(__dirname, `../circuits/${circuit.dir}/src/main.nr`));
            acir = compiled_program.circuit;
        } catch (e: any) {
            let acirByteArray = pathToUint8Array(path.resolve(__dirname, `../circuits/${circuit.dir}/build/${process.argv[2]}.acir`));
            acir = acir_from_bytes(acirByteArray);
        }
        console.log(`Setting up generic verifier for ${circuit.name} proof...`);
        let [_, verifier] = await setup_generic_prover_and_verifier(acir);

        // Replace auto generated TurboVerifier name with <circuit_name>Verifer
        const sc = verifier.SmartContract().replace('TurboVerifier', circuit.contract);
        syncWriteFile(`../contracts/${circuit.contract}.sol`, sc);

        console.log(`Done writing ${circuit.name} Verifier contract.`);
    }
}

function syncWriteFile(filename: string, data: any) {
    writeFileSync(join(__dirname, filename), data, {
        flag: 'w',
    });
}

generateVerifierContracts().then(() => process.exit(0)).catch(console.log);
