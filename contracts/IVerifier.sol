//SPDX-License-Identifier: MIT
pragma solidity >=0.6.0;

interface IBoardVerifier {
    function verify(bytes calldata) external view returns (bool r);
}

interface IShotVerifier {
    function verify(bytes calldata) external view returns (bool r);
}
