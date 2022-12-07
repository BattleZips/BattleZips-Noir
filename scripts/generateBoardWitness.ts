// import * as circomlibjs from 'circomlibjs';
import { stringify } from "@iarna/toml";
import { BarretenbergWasm } from '@noir-lang/barretenberg/dest/wasm';
import { writeFileSync } from 'fs';
import { SinglePedersen } from '@noir-lang/barretenberg/dest/crypto/pedersen';
// const { buildMimc7 } = circomlibjs;

const numToHex = (val) => {
    const hex = (val).toString(16);
    return `${'0'.repeat(64 - hex.length)}${hex}`;
}

(async () => {
    const barretenberg = await BarretenbergWasm.new();
    const pedersen = new SinglePedersen(barretenberg);
    const ships = [
        0, 0, 0, // 0, 1, 2, 3, 4
        0, 1, 0, // 10, 11, 12, 13
        0, 2, 0, // 20, 21, 22
        0, 3, 0, // 30, 31, 32
        0, 4, 0 // 40, 41
    ];
    const shipBuffer = pedersen.compressInputs(ships.map(coord => Buffer.from(numToHex(coord), 'hex')));
    const hash = `0x${shipBuffer.toString('hex')}`
    writeFileSync('circuits/board/Prover.toml', stringify({ hash, ships }));
    console.log('Witness written to Prover.toml');
    writeFileSync('circuits/board/Verifier.toml', stringify({
        setpub: [],
        hash,
    }));
    console.log('Verifier written to Verifier.toml');
})();