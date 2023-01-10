# BattleZips - Noir

## A Zero-Knowledge Implementation of the Game BattleShip powered by Aztec Network's Noir Domain Specific Language

<p align="center">
  <img width="250" height="250" src="aztec_logo.png">
  <img width="250" height="250" src="battlezips.png">
</p>

This repository aims to demonstrate how [Aztec Network's](https://aztec.network/) domain specific language (DSL) [Noir](https://noir-lang.github.io/book/) can be used to create an adversarial incomplete information game on top of the Ethereum Blockchain. The corresponding written and video guide are set up in a way to allow anyone interested to follow along and easily implement their own Noir proofs and implement them into a React.js application.

This repo was created using the [nplate](https://github.com/whitenois3/nplate) Noir template.

## Video Series

Coming soon...

## Inspiration

BattleZips - Noir draws inspiration for its circuit and smart contract design from the popular board game [Battleship](<https://en.wikipedia.org/wiki/Battleship_(game)>). The game mechanics require that player ship positions be completely unknown to the other player. Cirucit and contract structure in BattleShips - Noir is based off of the one's from [BattleZips V1](https://github.com/BattleZips/BattleZips) where proofs were written in [Circom](https://github.com/iden3/circom).

Note: BattleZips V1 is project with no relation to Aztec Network or Mach 34

## Circuit Structure

There are two circuits that make up the entirety of the project; One to ensure board validity, and one to ensure shot validity

### Board Circuit

#### Inputs

- hash (public)
  - A hash of all ships as a public Fied input. The hashing algorithm of choice for this implementation was Pedersen although Mimc could have also been used with more constraints.
- ships (private)
  - A private Field array of length 15. Each three indicices in the array represents the `(x, y, z)` values of a ship. X is the x-coordinate of the board tile the ship is places, y is the y-coordinate, and z is a binary value (0 / 1) determining whether or not the ship is placed in a horizontal (0) or vertical orientation (1). Ships order is deterministically carrier to cruiser ( length 5 - 2)
  Note: As Noir does not yet support multidimensional arrays, the length 15 array was chosen to proceed. This will likely be changed to a 2D array of lengths `[5][3]` when possible in Noir

The board circuit establishes whether ships have been placed correctly on a players board. The board is abstracted from a `10x10` grid where a coordinate on the board can be thought of a an `(x, y)` point (where x and y values range from `0..9`. i.e. top left is `(0, 0)` and bottom right is `(9,9)`. The proof first checks to see that all ships are in board boundaries by ensuring none of the ship coordinates are greater than 9 or less than 0. It will then check whether or not there are any collisions where ships are placed on the same coordinates. Lastly it will compute the Pedersen hash of all ship positions internally in the proof an ensure the computed cash equals the public input.

### Shot Circuit

#### Inputs

- hash (public)
  - A hash of all ships as a public Fied input. The hashing algorithm of choice for this implementation was Pedersen although Mimc could have also been used with more constraints.
- hit (public)
  - Binary value where 0 represents a miss and 1 represents a hit for the provided shot
- ships (private)
  - A private Fielpd array of length 15. Each three indicices in the array represents the `(x, y, z)` values of a ship.
- shot(public)
  - A public Field array of length two that represents a shot. Index zero corresponds to the x-coordinate and index one corresponds to the y-coordinate

This circuit will first ensure that the shot coordinates fall withing the bounds of the board. Next it will check that the ship array computes to a matching Pedersen hash as the one passed in as a public input. Lastly with the ship array the circuit will determine whether the shot results in a hit and contrain that again the hit declaration public input.

## Background on Noir

Noir is a ZK DSL for writing arbritray zero-knowledge circuits created by Aztec Network. It aims to differentiate itself from other DSL's like Zokrates or Circom by providing a syntactic structure similar to general purpose programming languages. This strucutre makes it much more friendly to traditional software developers without an extensive background in cryptography.

## Setup

### Generating Proof Witnesses / Proving and Verifying Proofs

1.

### Deploying and Verifying Contracts

### Generating Frontend Files

## Auxilary Resources

### Noir Links:

### Important Note

BattleZips Noir is a standalone project from all other releases under the BattleZips IP. Association between Mach 34 and Aztec in BattleZips Noir confers NO association between Mach 34 and any third parties engaging with the IP through projects like BattleZipsV2.
