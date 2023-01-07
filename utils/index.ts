import { readFileSync } from "fs";

/**
 * Determine if err message can be ignored
 * @param {string} err - the error text returned from etherscan verification
 * @return true if bytecode is verified, false otherwise 
 */
export const alreadyVerified = (err) => {
    return err.includes('Reason: Already Verified')
        || err.includes('Contract source code already verified')
}

/**
 * Helper function to add a delay in execution. (helpful for external async events to complete)
 * 
 * @param {number} time - time in milleseconds 
 * @returns A promise that will resolve in the specified time
 */
export const delay = async (time: number): Promise<unknown> => {
    return new Promise(res => setTimeout(res, time))
}

/**
 * Converts a number to a 32 byte hex string so structure mirrors Noir's for accurate hashing
 * 
 * @param {number} num - number to be hexlified
 * @returns 32 bytes hex string
 */
export const numToHex = (num: number) => {
    const hex = (num).toString(16);
    // Add missing padding based of hex number length
    return `${'0'.repeat(64 - hex.length)}${hex}`;
}

/**
 * Helper function to conver a read file buffer into a byte array
 * 
 * @param {string} path - Path to read file from 
 * @returns byte array from read file buffer
 */
export const pathToUint8Array = (path: string) => {
    let buffer = readFileSync(path);
    return new Uint8Array(buffer);
}

/**
 * Helper function to log status of game to the console without displaying output on multiple lines
 * 
 * @param {string} msg Message to display in the console
 */
export const printLog = (msg: string) => {
    if (process.stdout.isTTY) {
        process.stdout.clearLine(-1);
        process.stdout.cursorTo(0);
        process.stdout.write(msg);
    }
}