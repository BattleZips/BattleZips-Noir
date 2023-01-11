# BattleZips-Noir

## A Zero-Knowledge Implementation of the Game BattleShip powered by Aztec Network's Noir Domain-Specific Language

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

<p align="center">
  <img width="250" height="250" src="aztec_logo.png">
  <img width="250" height="250" src="battlezips.png">
</p>

This repository demonstrates how [Aztec Network's](https://aztec.network/) domain-specific language (DSL) [Noir](https://noir-lang.github.io/book/) can be used to create an adversarial incomplete information game on top of the Ethereum Blockchain. The corresponding guides are intended to showcase how to easily implement Noir proofs into a React.js application.

This repo was created using the [nplate](https://github.com/whitenois3/nplate) Noir template.

## Table of Contents

- [Video series](#video-series)
- [Get in Touch](#get-in-touch)
- [Related Repositories](#related-repositories)
- [Noir Links](#noir-links)
- [Circuit Struncture](#ciruit-structure)
  - [Board Circuit](#board-circuit)
  - [Shot Circuit](#shot-circuit)
- [Setup](#ciruit-structure)
  1. [Download Noir](#setup-1)
  2. [Clone Repository](#setup-2)
  3. [Install Dependencies](#setup-3)
  4. [Prove and Verify With Nargo (Optional)](#setup-4)
  5. [Update .env](#setup-5)
  6. [Run Tests](#setup-6)
  7. [Deploy and Verify Contracts](#setup-7)
  8. [Generate Frontend Files](#setup-8)

## Video Series <a name="video-series" />

Coming soon...

## Get In Touch <a name="get-in-touch" />

Check out the following links to provide feedback or ask questions!

- [Aztec Discord](https://discord.com/channels/563037431604183070/)
- [BattleZips Discord](https://discord.gg/2dkzdDwq)

## Related Repositories <a name="related-repositories" />

- [BattleZips-Noir Frontend](https://github.com/Ian-Bright/BattleZips-Noir-frontend)
- [BattleZips Subgraph](https://github.com/BattleZips/battlezip-subgraph)

## Noir Links <a name="noir-links" />

- Nplate Noir starter kit: [https://github.com/whitenois3/nplate](https://github.com/whitenois3/nplate);
- Gitbook: [https://noir-lang.github.io/book/](https://noir-lang.github.io/book/)
- Awesome Noir: [https://github.com/noir-lang/awesome-noir](https://github.com/noir-lang/awesome-noir)
  - Git repo with links to many useful Noir resources

## Inspiration

BattleZips-Noir draws inspiration for circuit and smart contract design from the popular board game [Battleship](<https://en.wikipedia.org/wiki/Battleship\_(game)>). The game mechanics require that player's ship positions be completely unknown to the other player, which is a unique use case of zero-knowledge cryptography in a blockchain context. Circuit and contract structure in BattleZips-Noir is derived from [BattleZips V1](https://github.com/BattleZips/BattleZips) where proofs were written in [Circom](https://github.com/iden3/circom).

## Circuit Structure <a name="circuit-structure" />

Two circuits comprise the project; a game instantiation proof in the form of Board verification, and a game turn proof in the form of Shot verification.

### Board Circuit <a name="board-circuit" />

#### Inputs

- hash (public)
  - A hash of all ships as a public `Field` input. Pedersen hashing offers the most computationally efficient binding commitments for our purposes.
- ships (private)
  - A private `Field` array of length 15. Every three elements in the array should be deserialized into the tuple `(x, y, z)` for a ship's placement. X is the x-coordinate of the board tile, y is the y-coordinate, and z is a binary value (0 / 1) determining whether or not the ship is placed in a horizontal (0) or vertical orientation (1). Ships order is deterministically [carrier, battleship, cruiser, submarine, destroyer] -> [5, 4, 3, 3, 2]
    Note: As Noir does not yet support multidimensional arrays, the length 15 array was chosen to proceed. This will likely be changed to a 2D array of lengths `[5][3]` when possible in Noir

The board circuit establishes whether ships have been placed correctly on a player's board. The board is abstracted from a `10x10` grid where a coordinate on the board can be thought of as an `(x, y)` point (where x and y values range from `0..9`. i.e. top left is `(0, 0)` and bottom right is `(9,9)`. The proof first checks to see that all ships are in board boundaries by ensuring none of the ship coordinates are greater than 9 or less than 0. It will then check whether or not there are any collisions where ships are placed on the same coordinates. Lastly, it will compute the Pedersen hash of all ship positions internally in the proof and ensure the computed cash equals the public input.

### Shot Circuit <a name="shot-circuit" />

#### Inputs

- hash (public)
  - A hash of all ships as a public `Field` input. The hashing algorithm of choice for this implementation was Pedersen although Mimc could have also been used with more constraints.
- hit (public)
  - Binary value where 0 represents a miss and 1 represents a hit for the provided shot
- ships (private)
  - A private `Field` array of length 15. Every three elements in the array represent the `(x, y, z)` values of a ship.
- shot(public)
  - A public Field array of length two that represents a shot. Index zero corresponds to the x-coordinate and index one corresponds to the y-coordinate

This circuit will first ensure that the shot coordinates fall within the bounds of the board. Next, it will check that the ship array computes a matching Pedersen hash as the one passed in as public input. Lastly, with the ship array the circuit will determine whether the shot results in a hit and constrain that again the hit declaration public input.

## Setup <a name="setup" />

The following steps will help guide you through how you would set up BattleZips-Noir from scratch, and can be used for reference when setting up arbitrary circuits

### 1. Download Noir to Local Machine <a name="setup-1" />

#### Option 1: Binaries

[See guide to install binaries here](https://noir-lang.github.io/book/getting_started/nargo/installation.html#option-1-binaries)

#### Option 2: Source

[See guide to install from source here](https://noir-lang.github.io/book/getting_started/nargo/installation.html#option-2-compile-from-source)

### 2. Clone Repository <a name="setup-2" />

```
git clone git@github.com:BattleZips/BattleZips-Noir.git
```

### 3. Install Dependencies <a name="setup-3" />

```
yarn
---
npm install
```

### <a name="setup-4" /> 4. Generate Proof Witnesses / Prove and Verify Proofs With Nargo (Optional)

In order to prove and verify proofs we must ensure that our circuits have witness files generated to demonstrate valid input to a proof. Additionally, public inputs must be written to the Verifier.toml file. The witnesses and verifier files can be generated by running:

```
yarn generate-witnesses
---
npm run generate-witnesses
```

Once the witnesses and verifier inputs have been generated then it is easy to prove and verify proofs with nargo. To prove all once must do is navigate the root directory of a proof where the Nargo.toml file is and run:

```
nargo prove <arbitray_file_name>
```

this will generate an proof file in the form `<arbitray_file_name>.proof`. To verify the proof run:

```
nargo verify <arbitray_file_name>
```

Note: You can also compile noir proofs using nargo and generate acir files by entering the following command:

```
nargo compile <arbitray_file_name>
```

The acir will be written to `build/<arbitray_file_name>.acir` In the BattleZips-Noir tests we generate the acir with typescript so the step above is not necessary to have generated acir for testing. Still useful to know though!

### 5. Update .env <a name="setup-5" />

Add the following variables to your .env file:

```
ETHERSCAN_KEY=<val>
INFURA=<val>
MNEMONIC=<val>
```

### 6. Run Tests <a name="setup-6" />

Run test for the circuits with the following command:

```
test-circuit # runs locally
---
test-circuit:goerli # runs on goerli
```

to test the BattleshipGame contracts with Verifier contracts linked in run:

```
test-game # runs locally
---
test-game:goerli # runs on goerli
```

### 7. Deploy and Verify Contracts <a name="setup-7" />

Once the .env file has been updated then deploying contracts is easy. Simply run:

```
yarn deploy
---
npm run deploy
```

This will then write the deployed contracts addresses to `contracts.json` in the [deploy]("https://github.com/BattleZips/BattleZips-Noir/tree/main/deploy") directory. After deploying the script will then try to verify all the contracts on etherscan. If the script is interrupted then it can pick up where it left off on the deployed contracts by running:

```
yarn verify
---
npm run verify
```

### 8. Generate Frontend Files <a name="setup-8" />

The Aztec Backend packages required for generating proofs do not currently work perfectly in frontend generated using [create-react-app](https://create-react-app.dev/). In order to get things to run we need to pass over the acir and circuit files for a specific circuit as well as port over the corresponding wasm files to the aztec backend packages. The process has been simplified to one command. All that needs to be run in the root directory of the app is:

```
yarn generate-frontend-files
---
npm run generate-frontend-files
```

This command will generate an acir and circuit file for each specified proof as well as copy the the `@noir-lang` package wasm files out from `node_modules`. These files will then get written to a subdirectory of [deploy]("https://github.com/BattleZips/BattleZips-Noir/tree/main/deploy") called `frontend`. From here they can simply be copied to the public directory of the [BattleZips-Noir frontend]("https://github.com/Ian-Bright/BattleZips-Noir-frontend")

### Important Note

BattleZips-Noir is a standalone project from all other releases under the BattleZips IP. Association between Mach 34 and Aztec in BattleZips-Noir confers NO association between Mach 34 and any third parties engaging with the IP through projects like BattleZipsV2.
