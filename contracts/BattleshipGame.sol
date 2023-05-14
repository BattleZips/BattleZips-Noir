//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./IBattleshipGame.sol";

contract BattleshipGame is IBattleshipGame {
    /// CONSTRUCTOR ///

    /**
     * Construct new instance of Battleship manager
     *
     * @param _forwarder address - the address of the erc2771 trusted forwarder (NOT RELATED TO NOIR)
     * @param _bv address - the address of the initial board validity prover
     * @param _sv address - the address of the shot hit/miss prover
     */
    constructor(
        address _forwarder,
        address _bv,
        address _sv
    ) ERC2771Context(_forwarder) {
        trustedForwarder = _forwarder;
        bv = IVerifier(_bv);
        sv = IVerifier(_sv);
    }

    /// FUNCTIONS ///

    function newGame(
        bytes calldata _proof,
        bytes32 calldata _commitment
    ) external override canPlay {
        // verify integrity of board configuration
        require(bv.verify(_proof, [_commitment]), "Invalid Board Config!");
        // instantate new game storage
        gameIndex++;
        games[gameIndex].status = GameStatus.Started;
        games[gameIndex].participants[0] = msg.sender;
        games[gameIndex].boards[0] = commitment;
        playing[msg.sender] = gameIndex;
        // mark game as started
        emit Started(gameIndex, msg.sender);
    }

    function leaveGame(uint256 _game) external override isPlayer(_game) {
        Game storage game = games[_game];
        // Check if game has been started with two players. If so then forfeit
        if (game.status == GameStatus.Joined) {
            game.winner = msg.sender == game.participants[0]
                ? game.participants[1]
                : game.participants[0];
            playing[game.participants[0]] = 0;
            playing[game.participants[1]] = 0;
            emit Won(game.winner, _game);
        } else {
            playing[game.participants[0]] = 0;
            emit Left(msg.sender, _game);
        }
        game.status = GameStatus.Over;
    }

    function joinGame(
        uint256 _game,
        bytes calldata _proof,
        bytes32 calldata _commitment
    ) external override canPlay joinable(_game) {
        // verify integrity of board configuration
        require(bv.verify(_proof, [_commitment]), "Invalid Board Config!");
        // update game storage to join game
        games[_game].participants[1] = msg.sender;
        games[_game].boards[1] = commitment;
        games[_game].status = GameStatus.Joined;
        playing[msg.sender] = _game;
        // mark game as started
        emit Joined(_game, msg.sender);
    }

    function firstTurn(
        uint256 _game,
        uint256[2] calldata _shot
    ) external override myTurn(_game) {
        Game storage game = games[_game];
        require(game.nonce == 0, "!Turn1");
        game.shots[game.nonce] = _shot;
        game.nonce++;
        emit Shot(_shot[0], _shot[1], _game);
    }

    function turn(
        uint256 _game,
        uint256[2] calldata _next,
        bytes calldata _proof,
        bool _hit
    ) external override myTurn(_game) nullified(_game, _next) {
        // check valid game
        Game storage game = games[_game];
        require(game.nonce != 0, "!turn");

        // check proof
        require(
            sv.verify(
                _proof,
                [
                    game.boards[game.nonce % 2],
                    bytes32(hit),
                    bytes32(game.shots[game.nonce - 1][0]),
                    bytes32(game.shots[game.nonce - 1][1])
                ]
            ),
            "!shot_proof"
        );

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
}
