//SPDX-License-Identifier: MIT
pragma solidity >=0.6.0;

import "./IVerifier.sol";

contract PublicInputTest {
    IBoardVerifier bv; // verifier for proving initial board rule compliance
    IShotVerifier sv; // verifier for proving shot hit/ miss

    /// CONSTRUCTOR ///

    /**
     * Construct new instance of Battleship manager
     *
     * @param _bv address - the address of the initial board validity prover
     * @param _sv address - the address of the shot hit/miss prover
     */
    constructor(address _bv, address _sv) {
        bv = IBoardVerifier(_bv);
        sv = IShotVerifier(_sv);
    }

    /// FUNCTIONS ///

    function verifyBoardProof(bytes memory _proof) public view returns (bool) {
        return bv.verify(_proof);
    }

    function extractPublicInput(
        bytes memory _proof,
        uint256 index
    ) public pure returns (bytes32 result) {
        assembly {
            result := mload(add(add(_proof, 32), mul(index, 32)))
        }
    }

    function shotPublicInputsBytes(
        bytes memory _proof
    ) public pure returns (bytes32[4] memory result) {
        bytes32 commitment = extractPublicInput(_proof, 0);
        bytes32 hit = extractPublicInput(_proof, 1);
        bytes32 x = extractPublicInput(_proof, 2);
        bytes32 y = extractPublicInput(_proof, 3);
        return [commitment, hit, x, y];
    }

    function shotPublicInputs(
        bytes memory _proof
    ) public pure returns (bytes32 commitment, bool hit, uint8 x, uint8 y) {
        commitment = extractPublicInput(_proof, 0);
        bytes32 _hit = extractPublicInput(_proof, 1);
        bytes32 _x = extractPublicInput(_proof, 2);
        bytes32 _y = extractPublicInput(_proof, 3);
        assembly {
            hit := iszero(iszero(_hit))
            x := and(_x, 0xff)
            y := and(_y, 0xff)
        }
        return (commitment, hit, x, y);
    }
}
