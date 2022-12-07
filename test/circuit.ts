import {
  create_proof,
  setup_generic_prover_and_verifier,
  verify_proof,
} from '@noir-lang/barretenberg/dest/client_proofs';
import { BarretenbergWasm } from '@noir-lang/barretenberg/dest/wasm';
import { SinglePedersen } from '@noir-lang/barretenberg/dest/crypto';
import { compile } from '@noir-lang/noir_wasm';
import { expect } from 'chai';
import { resolve } from 'path';
import { numToHex } from '../utils';

describe('Test Noir circuits', async () => {
  let barretenberg;
  let pedersen;

  before(async () => {
    barretenberg = await BarretenbergWasm.new();
    pedersen = new SinglePedersen(barretenberg);
  });

  xdescribe('Test Board circuit', async () => {
    let acir;
    let boardCircuit;
    let prover;
    let verifier;

    before(async () => {
      console.log('Generating Board circuit...');
      boardCircuit = compile(resolve(__dirname, '../circuits/board/src/main.nr'));
      acir = boardCircuit.circuit;
      [prover, verifier] = await setup_generic_prover_and_verifier(acir);
    });

    describe('Test board range constraints', async () => {
      it('Should throw error with negative value supplied', async () => {
        const ships = [
          0, 0, 0,  // Carrier: Length 5
          0, -1, 0, // Battleship: Length 4
          0, -2, 0, // Cruiser: Length 3
          0, -3, 0, // Submarine: Length 3
          0, -4, 0  // Cruiser: Length 2 
        ];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => Buffer.from(numToHex(coord), 'hex')));
        const abi = {
          hash: `0x${shipBuffer.toString('hex')}`,
          ships
        }
        try {
          const proof = await create_proof(prover, acir, abi);
          const verified = await verify_proof(verifier, proof);
          expect(verified).to.be.false;
        } catch (err) {
          expect(err.name).to.include('RuntimeError');
        }
      });

      it('Verification should fail with non-binary z-coordinate', async () => {
        const ships = [
          0, 0, 2,
          1, 0, 1,
          2, 0, 1,
          3, 0, 1,
          4, 0, 1
        ];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => Buffer.from(numToHex(coord), 'hex')));
        const abi = {
          hash: `0x${shipBuffer.toString('hex')}`,
          ships
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });

      it('Verification should fail with x out of bounds in vertical orientation', async () => {
        const ships = [
          0, 0, 1,
          1, 0, 1,
          2, 0, 1,
          3, 0, 1,
          10, 0, 1
        ];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => Buffer.from(numToHex(coord), 'hex')));
        const abi = {
          hash: `0x${shipBuffer.toString('hex')}`,
          ships
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });

      it('Verification should fail with x out of bounds in horizontal orientation', async () => {
        const ships = [
          6, 0, 0,
          0, 1, 0,
          0, 2, 0,
          0, 3, 0,
          0, 4, 0
        ];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => Buffer.from(numToHex(coord), 'hex')));
        const abi = {
          hash: `0x${shipBuffer.toString('hex')}`,
          ships
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });

      it('Verification should fail with y out of bounds in vertical orientation', async () => {
        const ships = [
          0, 2, 1,
          1, 4, 1,
          2, 8, 1,
          3, 3, 1,
          4, 5, 1
        ];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => Buffer.from(numToHex(coord), 'hex')));
        const abi = {
          hash: `0x${shipBuffer.toString('hex')}`,
          ships
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });

      it('Verification should fail with y out of bounds in horizontal orientation', async () => {
        const ships = [
          0, 2, 0,
          1, 4, 0,
          2, 10, 0,
          3, 3, 0,
          4, 5, 0
        ];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => Buffer.from(numToHex(coord), 'hex')));
        const abi = {
          hash: `0x${shipBuffer.toString('hex')}`,
          ships
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });
    })

    describe('Test ship collisions', async () => {
      it('Verification should fail with two horizontally oriented ships sharing coordinate', async () => {
        const ships = [
          0, 0, 0,
          0, 0, 0,
          0, 1, 0,
          0, 2, 0,
          0, 3, 0
        ];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => Buffer.from(numToHex(coord), 'hex')));
        const abi = {
          hash: `0x${shipBuffer.toString('hex')}`,
          ships
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });

      it('Verification should fail with two vertically oriented ships sharing coordinate', async () => {
        const ships = [
          0, 0, 1,
          1, 0, 1,
          2, 0, 1,
          2, 2, 1,
          3, 3, 1
        ];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => Buffer.from(numToHex(coord), 'hex')));
        const abi = {
          hash: `0x${shipBuffer.toString('hex')}`,
          ships
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });

      it('Verification should fail with varied board with several ship collisions', async () => {
        const ships = [
          0, 0, 1,
          0, 2, 1,
          5, 6, 0,
          7, 3, 1,
          5, 8, 0
        ];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => Buffer.from(numToHex(coord), 'hex')));
        const abi = {
          hash: `0x${shipBuffer.toString('hex')}`,
          ships
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });
    });

    describe('Test hash integrity', async () => {

      it('Verification should fail with empty string for hash', async () => {
        const ships = [
          0, 0, 1,
          0, 2, 1,
          5, 6, 0,
          7, 3, 1,
          5, 8, 0
        ];
        const abi = {
          hash: '',
          ships
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });

      it('Verification should fail with incorrect hex string for hash', async () => {
        const ships = [
          0, 0, 1,
          0, 2, 1,
          5, 6, 0,
          7, 3, 1,
          5, 8, 0
        ];
        const shipBuffer = pedersen.compressInputs(ships.reverse().map(coord => Buffer.from(numToHex(coord), 'hex')));
        const abi = {
          hash: `0x${shipBuffer.toString('hex')}`,
          ships
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });
    });

    describe('Test valid ship placements', async () => {

      it('Valid placement #1', async () => {
        const ships = [
          0, 0, 0,
          0, 1, 0,
          0, 2, 0,
          0, 3, 0,
          0, 4, 0
        ];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => Buffer.from(numToHex(coord), 'hex')));
        const abi = {
          hash: `0x${shipBuffer.toString('hex')}`,
          ships
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.true;
      });

      it('Valid placement #2', async () => {
        const ships = [
          0, 0, 1,
          1, 0, 1,
          2, 0, 1,
          3, 0, 1,
          4, 0, 1
        ];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => Buffer.from(numToHex(coord), 'hex')));
        const abi = {
          hash: `0x${shipBuffer.toString('hex')}`,
          ships
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.true;
      });

      it('Valid placement #3', async () => {
        const ships = [
          1, 4, 1,
          0, 1, 0,
          3, 4, 0,
          8, 0, 1,
          7, 9, 0
        ];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => Buffer.from(numToHex(coord), 'hex')));
        const abi = {
          hash: `0x${shipBuffer.toString('hex')}`,
          ships
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.true;
      });

      it('Valid placement #4', async () => {
        const ships = [
          4, 1, 1,
          3, 0, 0,
          2, 1, 1,
          2, 6, 0,
          9, 0, 1
        ];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => Buffer.from(numToHex(coord), 'hex')));
        const abi = {
          hash: `0x${shipBuffer.toString('hex')}`,
          ships
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.true;
      });

    })
  });

  describe('Test shot circuit', async () => {
    let acir;
    let prover;
    let shotCircuit;
    let verifier;

    before(async () => {
      console.log('Generating Shot circuit...');
      shotCircuit = compile(resolve(__dirname, '../circuits/shot/src/main.nr'));
      acir = shotCircuit.circuit;
      [prover, verifier] = await setup_generic_prover_and_verifier(acir);
    });

    xdescribe('Test shot range constraints', async () => {
      it('Should throw error with negative value supplied for shot', async () => {
        const ships = [
          0, 5, 0,
          0, 6, 0,
          0, 7, 0,
          0, 8, 0,
          0, 9, 0
        ];
        const shot = [-1, 6];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => (Buffer.from(numToHex(coord), 'hex'))));
        const hash = `0x${shipBuffer.toString('hex')}`
        const hit = 1;
        const abi = {
          hash,
          hit,
          ships,
          shot
        }
        try {
          const proof = await create_proof(prover, acir, abi);
          const verified = await verify_proof(verifier, proof);
          expect(verified).to.be.false;
        } catch (err) {
          expect(err.name).to.include('RuntimeError');
        }
      });

      it('Verification should fail with x-coordinate out of board boundaries', async () => {
        const ships = [
          0, 5, 0,
          0, 6, 0,
          0, 7, 0,
          0, 8, 0,
          0, 9, 0
        ];
        const shot = [10, 6];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => (Buffer.from(numToHex(coord), 'hex'))));
        const hash = `0x${shipBuffer.toString('hex')}`
        const hit = 1;
        const abi = {
          hash,
          hit,
          ships,
          shot
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });

      it('Verification should with y-coordinate out of board boundaries', async () => {
        const ships = [
          0, 5, 0,
          0, 6, 0,
          0, 7, 0,
          0, 8, 0,
          0, 9, 0
        ];
        const shot = [1, 12];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => (Buffer.from(numToHex(coord), 'hex'))));
        const hash = `0x${shipBuffer.toString('hex')}`
        const hit = 1;
        const abi = {
          hash,
          hit,
          ships,
          shot
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });
    });

    xdescribe('Test hash integrity', async () => {
      it('Verification should with empty string provided as hash', async () => {
        const ships = [
          0, 5, 0,
          0, 6, 0,
          0, 7, 0,
          0, 8, 0,
          0, 9, 0
        ];
        const shot = [2, 5];
        const hash = ''
        const hit = 1;
        const abi = {
          hash,
          hit,
          ships,
          shot
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });

      it('Verification should fail with incorrect hex string as hash', async () => {
        const ships = [
          0, 5, 0,
          0, 6, 0,
          0, 7, 0,
          0, 8, 0,
          0, 9, 0
        ];
        const shot = [2, 5];
        const shipBuffer = pedersen.compressInputs(ships.reverse().map(coord => (Buffer.from(numToHex(coord), 'hex'))));
        const hash = `0x${shipBuffer.toString('hex')}`
        const hit = 1;
        const abi = {
          hash,
          hit,
          ships,
          shot
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });
    });

    describe('Test hit constraints', async () => {

      it('Verification should fail when miss is declared as hit when z=0', async () => {
        const ships = [
          0, 5, 0,
          0, 6, 0,
          0, 7, 0,
          0, 8, 0,
          0, 9, 0
        ];
        const shot = [0, 0];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => (Buffer.from(numToHex(coord), 'hex'))));
        const hash = `0x${shipBuffer.toString('hex')}`
        const hit = 1;
        const abi = {
          hash,
          hit,
          ships,
          shot
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });

      it('Verification should fail when hit is declared as miss when z=0', async () => {
        const ships = [
          0, 5, 0,
          0, 6, 0,
          0, 7, 0,
          0, 8, 0,
          0, 9, 0
        ];
        const shot = [0, 5];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => (Buffer.from(numToHex(coord), 'hex'))));
        const hash = `0x${shipBuffer.toString('hex')}`
        const hit = 0;
        const abi = {
          hash,
          hit,
          ships,
          shot
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });

      it('Verification should fail when miss is declared as hit when z=1', async () => {
        const ships = [
          0, 0, 1,
          1, 6, 1,
          6, 3, 1,
          3, 2, 1,
          4, 7, 1
        ];
        const shot = [5, 0];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => (Buffer.from(numToHex(coord), 'hex'))));
        const hash = `0x${shipBuffer.toString('hex')}`
        const hit = 1;
        const abi = {
          hash,
          hit,
          ships,
          shot
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });

      it('Verification should fail when hit is declared as miss when z=1', async () => {
        const ships = [
          0, 0, 1,
          1, 6, 1,
          6, 3, 1,
          3, 2, 1,
          4, 7, 1
        ];
        const shot = [6, 4];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => (Buffer.from(numToHex(coord), 'hex'))));
        const hash = `0x${shipBuffer.toString('hex')}`
        const hit = 0;
        const abi = {
          hash,
          hit,
          ships,
          shot
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.false;
      });
    });

    xdescribe('Test valid shots', async () => {

      it('Valid shot correctly declared as hit in vertical orientation', async () => {
        const ships = [
          0, 0, 1,
          1, 6, 1,
          6, 3, 1,
          3, 2, 1,
          4, 7, 1
        ];
        const shot = [6, 4];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => (Buffer.from(numToHex(coord), 'hex'))));
        const hash = `0x${shipBuffer.toString('hex')}`
        const hit = 1;
        const abi = {
          hash,
          hit,
          ships,
          shot
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.true;
      });

      it('Valid shot correctly declared as hit in horizontal orientation', async () => {
        const ships = [
          3, 4, 0,
          5, 9, 0,
          2, 2, 0,
          7, 3, 0,
          6, 7, 0
        ];
        const shot = [3, 4];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => (Buffer.from(numToHex(coord), 'hex'))));
        const hash = `0x${shipBuffer.toString('hex')}`
        const hit = 1;
        const abi = {
          hash,
          hit,
          ships,
          shot
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.true;
      });

      it('Valid shot correctly declared as miss in vertical orientation', async () => {
        const ships = [
          3, 1, 1,
          5, 4, 1,
          6, 2, 1,
          7, 3, 1,
          3, 8, 1
        ];
        const shot = [9, 4];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => (Buffer.from(numToHex(coord), 'hex'))));
        const hash = `0x${shipBuffer.toString('hex')}`
        const hit = 0;
        const abi = {
          hash,
          hit,
          ships,
          shot
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.true;
      });

      it('Valid shot correctly declared as miss in horizontal orientation', async () => {
        const ships = [
          3, 5, 0,
          4, 2, 0,
          1, 3, 0,
          6, 4, 0,
          7, 3, 0
        ];
        const shot = [8, 6];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => (Buffer.from(numToHex(coord), 'hex'))));
        const hash = `0x${shipBuffer.toString('hex')}`
        const hit = 0;
        const abi = {
          hash,
          hit,
          ships,
          shot
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.true;
      });

      it('Valid shot correctly declared as hit with mixed board orientations', async () => {
        const ships = [
          1, 1, 1,
          5, 1, 1,
          4, 4, 1,
          1, 7, 1,
          3, 8, 0
        ];
        const shot = [4, 5];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => (Buffer.from(numToHex(coord), 'hex'))));
        const hash = `0x${shipBuffer.toString('hex')}`
        const hit = 1;
        const abi = {
          hash,
          hit,
          ships,
          shot
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.true;
      });

      it('Valid shot correctly declared as miss with mixed board orientations', async () => {
        const ships = [
          1, 1, 1,
          5, 1, 1,
          4, 4, 1,
          1, 7, 1,
          3, 8, 0
        ];
        const shot = [2, 1];
        const shipBuffer = pedersen.compressInputs(ships.map(coord => (Buffer.from(numToHex(coord), 'hex'))));
        const hash = `0x${shipBuffer.toString('hex')}`
        const hit = 0;
        const abi = {
          hash,
          hit,
          ships,
          shot
        }
        const proof = await create_proof(prover, acir, abi);
        const verified = await verify_proof(verifier, proof);
        expect(verified).to.be.true;
      });
    });

  });
});