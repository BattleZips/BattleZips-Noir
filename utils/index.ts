import { readFileSync } from "fs";

export const numToHex = (num: number) => {
    const hex = (num).toString(16);
    return `${'0'.repeat(64 - hex.length)}${hex}`;
}

export const pathToUint8Array = (path: string) => {
    let buffer = readFileSync(path);
    return new Uint8Array(buffer);
}