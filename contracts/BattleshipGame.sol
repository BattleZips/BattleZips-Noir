//SPDX-License-Identifier: MIT
pragma solidity >=0.6.0;

import "./IBattleshipGame.sol";

contract BattleshipGame is IBattleshipGame {
    /// CONSTRUCTOR ///

    /**
     * Construct new instance of Battleship manager
     *
     * @param _forwarder address - the address of the erc2771 trusted forwarder
     * @param _bv address - the address of the initial board validity prover
     * @param _sv address - the address of the shot hit/miss prover
     */
    constructor(
        address _forwarder,
        address _bv,
        address _sv
    ) ERC2771Context(_forwarder) {
        trustedForwarder = _forwarder;
        bv = IBoardVerifier(_bv);
        sv = IShotVerifier(_sv);
    }

    /// FUNCTIONS ///

    function newGame(bytes memory _proof) external override canPlay {
        // verify integrity of board configuration
        require(bv.verify(_proof), "Invalid Board Config!");
        // extract board commitment from public inputs to enforce shot proof inputs against
        bytes32 commitment;
        assembly {
            commitment := mload(add(_proof, 32))
        }
        // instantate new game storage
        gameIndex++;
        games[gameIndex].status = GameStatus.Started;
        games[gameIndex].participants[0] = _msgSender();
        games[gameIndex].boards[0] = commitment;
        playing[_msgSender()] = gameIndex;
        // mark game as started
        emit Started(gameIndex, _msgSender());
    }

    function leaveGame(uint256 _game) external override isPlayer(_game) {
        Game storage game = games[_game];
        // Check if game has been started with two players. If so then forfeit
        if (game.status == GameStatus.Joined) {
            game.winner = _msgSender() == game.participants[0]
                ? game.participants[1]
                : game.participants[0];
            playing[game.participants[0]] = 0;
            playing[game.participants[1]] = 0;
            emit Won(game.winner, _game);
        } else {
            playing[game.participants[0]] = 0;
            emit Left(_msgSender(), _game);
        }
        game.status = GameStatus.Over;
    }

    function joinGame(
        uint256 _game,
        bytes memory _proof
    ) external override canPlay joinable(_game) {
        require(bv.verify(_proof), "Invalid Board Config!");
        // extract board commitment from public inputs to enforce shot proof inputs against
        bytes32 commitment;
        assembly {
            commitment := mload(add(_proof, 32))
        }
        // update game storage to join game
        games[_game].participants[1] = _msgSender();
        games[_game].boards[1] = commitment;
        games[_game].status = GameStatus.Joined;
        playing[_msgSender()] = _game;
        // mark game as started
        emit Joined(_game, _msgSender());
    }

    function firstTurn(
        uint256 _game,
        uint256[2] memory _shot
    ) external override myTurn(_game) {
        Game storage game = games[_game];
        require(game.nonce == 0, "!Turn1");
        game.shots[game.nonce] = _shot;
        game.nonce++;
        emit Shot(_shot[0], _shot[1], _game);
    }

    function turn(
        uint256 _game,
        uint256[2] memory _next,
        bytes memory _proof
    ) external override myTurn(_game) nullified(_game, _next) {
        // check valid game
        Game storage game = games[_game];
        require(game.nonce != 0, "!turn");

        // check proof uses player's board commitment
        require(
            checkCommitment(_proof, game.boards[game.nonce % 2]),
            "!commitment"
        );

        // check proof uses previous shot
        require(
            checkShot(_proof, game.shots[game.nonce - 1]),
            "Wrong shot coordinates"
        );

        // check proof
        require(sv.verify(_proof), "!shot_proof");

        // get constrained hit/miss
        bool hit;
        assembly {
            hit := mload(add(_proof, 64))
        }

        // increment hit nonce if hit
        if (hit) game.hitNonce[(game.nonce - 1) % 2]++;

        // report the hit/ miss
        // @todo: only report if hit
        emit Report(hit, _game);

        // check if game over
        if (game.hitNonce[(game.nonce - 1) % 2] >= HIT_MAX) gameOver(_game);
        else {
            // add next shot
            game.shots[game.nonce] = _next;
            // set shot (serialized '10y + x') nullifier for given player
            game.nullifiers[_next[0] + _next[1] * 10][game.nonce % 2] = true;
            // increment game nonce
            game.nonce++;
            // emit shot coordinates for indexing
            emit Shot(_next[0], _next[1], _game);
        }
    }

    /// VIEWS ///

    function gameState(
        uint256 _game
    )
        external
        view
        override
        returns (
            address[2] memory _participants,
            bytes32[2] memory _boards,
            uint256 _turnNonce,
            uint256[2] memory _hitNonce,
            GameStatus _status,
            address _winner
        )
    {
        _participants = games[_game].participants;
        _boards = games[_game].boards;
        _turnNonce = games[_game].nonce;
        _hitNonce = games[_game].hitNonce;
        _status = games[_game].status;
        _winner = games[_game].winner;
    }

    /// INTERNAL ///

    /**
     * Handle transitioning game to finished state & paying out
     *
     * @param _game uint256 - the nonce of the game being finalized
     */
    function gameOver(uint256 _game) internal {
        Game storage game = games[_game];
        require(
            game.hitNonce[0] == HIT_MAX || game.hitNonce[1] == HIT_MAX,
            "!Over"
        );
        require(game.winner == address(0), "Over");
        game.winner = game.hitNonce[0] == HIT_MAX
            ? game.participants[0]
            : game.participants[1];
        game.status = GameStatus.Over;
        playing[games[_game].participants[0]] = 0;
        playing[games[_game].participants[1]] = 0;
        emit Won(game.winner, _game);
    }

    /**
     * Checks that the commitment in a proof is the same as a given commitment
     * @dev board commitment is stored in the first 32 bytes of a proof string
     *
     * @param _proof bytes - the proof string to extract public inputs from
     * @param _commitment bytes32 - the commitment to compare against extracted value
     * @return ok bool - true if commitments match
     */
    function checkCommitment(
        bytes memory _proof,
        bytes32 _commitment
    ) internal returns (bool ok) {
        assembly {
            let commitment := mload(add(_proof, 32))
            ok := eq(commitment, _commitment)
        }
    }

    /**
     * Checks that the commitment in a proof is the same as a given commitment
     * @dev board commitment is stored in the 3rd (x) and 4th (y) 32 byte slots of a proof string
     *
     * @param _proof bytes - the proof string to extract public inputs from
     * @param shot uint256[2] - the shot to compare against extracted values
     * @return ok bool - true if commitments match
     */
    function checkShot(
        bytes memory _proof,
        uint256[2] memory shot
    ) internal returns (bool ok) {
        assembly {
            let x := mload(add(_proof, 96))
            let y := mload(add(_proof, 128))
            let x_ok := eq(x, mload(shot))
            let y_ok := eq(y, mload(add(shot, 32)))
            ok := and(y_ok, x_ok)
        }
    }
}
