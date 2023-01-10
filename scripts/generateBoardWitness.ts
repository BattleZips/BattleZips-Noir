import { stringify } from "@iarna/toml";
import { BarretenbergWasm } from '@noir-lang/barretenberg/dest/wasm';
import { writeFileSync } from 'fs';
import { SinglePedersen } from '@noir-lang/barretenberg/dest/crypto/pedersen';
import { numToHex } from "../utils";

/**
 * Generate the witness for the Noir board proof
 */
(async () => {
    const barretenberg = await BarretenbergWasm.new();
    const pedersen = new SinglePedersen(barretenberg);
    // Number array of length 15 for sip coordinates (all values must be below 9 with every third either
    // 0 or 1 to represent orientation
    const ships = [
        0, 0, 0, // 0, 1, 2, 3, 4
        0, 1, 0, // 10, 11, 12, 13
        0, 2, 0, // 20, 21, 22
        0, 3, 0, // 30, 31, 32
        0, 4, 0 // 40, 41
    ];
    // Coordinate array must have values coverted to a 32 bytes hex string for Barretenberg Pedersen to match Noir's
    // implementation. Returns a buffer
    const shipBuffer = pedersen.compressInputs(ships.map(coord => Buffer.from(numToHex(coord), 'hex')));
    // Convert pedersen buffer to hex string and prefix with "0x" to create hash
    const hash = `0x${shipBuffer.toString('hex')}`
    // Convert to TOML and write witness to prover.toml and public inputs to verified
    writeFileSync('circuits/board/Prover.toml', stringify({ hash, ships }));
    console.log('Board witness written to Prover.toml');
    writeFileSync('circuits/board/Verifier.toml', stringify({
        setpub: [],
        hash,
    }));
    console.log('Board verifier written to Verifier.toml');
})();