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

    function newGame(
        uint256 _boardHash,
        bytes calldata _proof
    ) external override canPlay {
        require(bv.verify(_proof), "Invalid Board Config!");
        gameIndex++;
        games[gameIndex].status = GameStatus.Started;
        games[gameIndex].participants[0] = _msgSender();
        games[gameIndex].boards[0] = _boardHash;
        playing[_msgSender()] = gameIndex;
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
        uint256 _boardHash,
        bytes calldata _proof
    ) external override canPlay joinable(_game) {
        require(bv.verify(_proof), "Invalid Board Config!");
        games[_game].participants[1] = _msgSender();
        games[_game].boards[1] = _boardHash;
        games[_game].status = GameStatus.Joined;
        playing[_msgSender()] = _game;
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
        emit Shot(uint8(_shot[0]), uint8(_shot[1]), _game);
    }

    function turn(
        uint256 _game,
        bool _hit,
        uint256[2] memory _next,
        bytes calldata _proof
    ) external override myTurn(_game) uniqueShot(_game, _next) {
        Game storage game = games[_game];
        require(game.nonce != 0, "Turn=0");
        require(sv.verify(_proof), "Invalid turn proof");
        // update game state
        game.hits[game.nonce - 1] = _hit;
        if (_hit) game.hitNonce[(game.nonce - 1) % 2]++;
        emit Report(_hit, _game);
        // check if game over
        if (game.hitNonce[(game.nonce - 1) % 2] >= HIT_MAX) gameOver(_game);
        else {
            // add next shot
            game.shots[game.nonce] = _next;
            uint8 shotPadding = games[_game].participants[0] == _msgSender()
                ? 0
                : 100;
            uint8 serializedShot = shotPadding +
                uint8(_next[0]) +
                uint8(_next[1]) *
                10;
            game.shotNullifiers[serializedShot] = true;
            game.nonce++;
            emit Shot(uint8(_next[0]), uint8(_next[1]), _game);
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
            uint256[2] memory _boards,
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
     * Helper method for extracting public inputs from a noir proof
     * @dev public inputs are serialized in 32 byte slots at the front of a proof string
     *
     * @param _proof bytes - the proof string to extract public inputs from
     * @param index uint256 - the index of the public input to extract
     */
    function extractPublicInput(
        bytes memory _proof,
        uint256 index
    ) public pure returns (bytes32 result) {
        assembly {
            result := mload(add(add(_proof, 32), mul(index, 32)))
        }
    }

    /**
     * Extracts the public inputs from a Board proof
     * [0] = board commitment (hash)
     *
     * @param _proof bytes - the proof string to extract public inputs from
     * @return commitment bytes32 - board hash exported as a public input
     */
    function boardPublicInputs(
        bytes memory _proof
    ) public pure returns (bytes32 commitment) {
        return extractPublicInput(_proof, 0);
    }

    /**
     * Extracts the public inputs from a Shot proof
     * [0] = board commitment (hash), [1] = hit assertion, [2] = shot x coord, [3] = shot y coord
     *
     * @param _proof bytes - the proof string to extract public inputs from
     * @return commitment bytes32 - board hash exported as a public input
     * @return hit bool - hit assertion exported as a public input
     * @return x uint8 - shot x coord exported as a public input
     * @return y uint8 - shot y coord exported as a public input
     */
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
