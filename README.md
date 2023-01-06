# BattleZips - Noir

### A Zero-Knowledge Implementation of the Game BattleShip powered by Aztec Network's Noir Language

<p align="center">
  <img width="350" height="350" src="aztec_logo.png">
  <img width="350" height="350" src="battlezips.png">
</p>
 
Click [`use this template`](https://github.com/whitenois3/nplate/generate) to create a new repository with this repo as the initial state.

## Development

Both hardhat and foundry are supported.
With the help of the `ffi`, you can write complex JS/TS scripts, feed them inputs FROM the foundry test contract and use the output in the test contract.

**Setup**

```bash
npm install
```

Regarding the installation of `nargo`, please refer to its repo [here](https://github.com/noir-lang/noir).

**Building**

```bash
cd circuits
nargo build
nargo compile BUILD_NAME
```

**Testing**

```bash
npx hardhat test
```

```bash
forge test --ffi
```

We have provided two bash scripts in `utils/` to make your life easier when it comes to generating the Verifier contract and a proof.

```
./utils/safeGenerateContract.sh
./utils/safeGenerateProof.sh
```

## License

[AGPL-3.0-only](https://github.com/abigger87/femplate/blob/master/LICENSE)

## Acknowledgements

- [femplate](https://github.com/abigger87/femplate)
- [basic_mul_noir_example](https://github.com/vezenovm/basic_mul_noir_example)

## Disclaimer

_These smart contracts are being provided as is. No guarantee, representation or warranty is being made, express or implied, as to the safety or correctness of the user interface or the smart contracts. They have not been audited and as such there can be no assurance they will work as intended, and users may experience delays, failures, errors, omissions, loss of transmitted information or loss of funds. The creators are not liable for any of the foregoing. Users should proceed with caution and use at their own risk._
