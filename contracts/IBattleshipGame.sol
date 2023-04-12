//SPDX-License-Identifier: MIT
pragma solidity >=0.6.0;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "./IVerifier.sol";

/**
 * Abstraction for Zero-Knowledge Battleship Game
 */
abstract contract IBattleshipGame is ERC2771Context {
    /// EVENTS ///

    event Left(address _by, uint256 _nonce);
    event Started(uint256 _nonce, address _by);
    event Joined(uint256 _nonce, address _by);
    event Shot(uint256 _x, uint256 _y, uint256 _game);
    event Report(bool hit, uint256 _game);
    event Won(address _winner, uint256 _nonce);

    /// STRUCTS ///

    enum GameStatus {
        Joined,
        NotStarted,
        Over,
        Started
    }

    struct Game {
        address[2] participants; // the two players in the game
        bytes32[2] boards; // pedersen hash of board placement for each player
        uint256 nonce; // turn #
        mapping(uint256 => uint256[2]) shots; // map turn number to shot coordinates
        mapping(uint256 => bool[2]) nullifiers; // Ensure shots are only made once
        uint256[2] hitNonce; // track # of hits player has made
        GameStatus status; // game lifecycle tracker
        address winner; // game winner
    }

    /// VARIABLES ///
    uint256 public constant HIT_MAX = 17; // number of hits before all ships are sunk

    uint256 public gameIndex; // current game nonce

    address public trustedForwarder; // make trusted forwarder public

    mapping(uint256 => Game) public games; // map game nonce to game data
    mapping(address => uint256) public playing; // map player address to game played

    IBoardVerifier bv; // verifier for proving initial board rule compliance
    IShotVerifier sv; // verifier for proving shot hit/ miss

    /// MODIFIERS ///

    /**
     * Ensure a message sender is not currently playing another game
     */
    modifier canPlay() {
        require(playing[_msgSender()] == 0, "Reentrant");
        _;
    }

    /**
     * Determine whether message sender is a member of a created or active game
     *
     * @param _game uint256 - the nonce of the game to check playability for
     */
    modifier isPlayer(uint256 _game) {
        require(playing[_msgSender()] == _game, "Not a player in game");
        _;
    }

    /**
     * Determine whether message sender is allowed to call a turn function
     *
     * @param _game uint256 - the nonce of the game to check playability for
     */
    modifier myTurn(uint256 _game) {
        require(playing[_msgSender()] == _game, "!Playing");
        require(games[_game].status == GameStatus.Joined, "!Playable");
        address current = games[_game].nonce % 2 == 0
            ? games[_game].participants[0]
            : games[_game].participants[1];
        require(_msgSender() == current, "!Turn");
        _;
    }

    /**
     * Make sure game is joinable
     * Will have more conditions once shooting phase is implemented
     *
     * @param _game uint256 - the nonce of the game to check validity for
     */
    modifier joinable(uint256 _game) {
        require(_game != 0 && _game <= gameIndex, "out-of-bounds");
        require(
            games[_game].status == GameStatus.Started,
            "Game has two players already"
        );
        _;
    }

    /**
     * Ensure shots are not nullified for a given player in a given game
     *
     * @param _game uint256 - the nonce of the game to check validity for
     * @param _shot uint256[2] - shot to check for nullification
     */
    modifier nullified(uint256 _game, uint256[2] memory _shot) {
        // serialize shot coordinates
        uint256 serialized = _shot[0] + _shot[1] * 10;
        // determine turn (must be run after isPlayer() to be safe)
        uint256 playerIndex = games[_game].participants[0] == _msgSender()
            ? 0
            : 1;
        // access shot nullifier
        bool nullifier = games[_game].nullifiers[serialized][playerIndex];
        // ensure shot is not nullified
        require(!nullifier, "Nullifer");
        _;
    }

    /**
     * Start a new board by uploading a valid board hash
     * @dev modifier canPlay
     *
     * @param _proof bytes calldata - zk proof of valid board
     */
    function newGame(bytes calldata _proof) external virtual;

    /**
     * Forfeit a game in the middle of playing of leave a game prior to starting
     * @dev modifier isPlayer
     *
     * @param _game uint256 - nonce of the game being played
     */
    function leaveGame(uint256 _game) external virtual;

    /**
     * Join existing game by uploading a valid board hash
     * @dev modifier canPlay joinable
     *
     * @param _game uint256 - the nonce of the game to join
     * @param _proof bytes calldata - zk proof of valid board
     */
    function joinGame(uint256 _game, bytes calldata _proof) external virtual;

    /**
     * Player 0 can makes first shot without providing proof
     * @dev modifier myTurn
     * @notice proof verification is inherently reactive
     *         first shot must be made to kick off the cycle
     * @param _game uint256 - the nonce of the game to take turn on
     * @param _shot uint256[2] - the (x,y) coordinate to fire at
     */
    function firstTurn(uint256 _game, uint256[2] memory _shot) external virtual;

    /**
     * Play turn in game
     * @dev modifier myTurn
     * @notice once first turn is called, repeatedly calling this function drives game
     *         to completion state. Loser will always be last to call this function and end game.
     * @param _game uint256 - the nonce of the game to play turn in
     * @param _next uint256[2] - the (x,y) coordinate to fire at after proving hit/miss
     *    - ignored if proving hit forces game over
     * @param _proof bytes calldata - zk proof of valid board
     */
    function turn(
        uint256 _game,
        uint256[2] memory _next,
        bytes calldata _proof
    ) external virtual;

    /**
     * Return current game info
     *
     * @param _game uint256 - nonce of game to look for
     * @return _participants address[2] - addresses of host and guest players respectively
     * @return _boards bytes32[2] - hashes of host and guest boards respectively
     * @return _turnNonce uint256 - the current turn number for the game
     * @return _hitNonce uint256[2] - the current number of hits host and guest have scored respectively
     * @return _status GameStatus - status of the game
     * @return _winner address - if game is won, will show winner
     */
    function gameState(
        uint256 _game
    )
        external
        view
        virtual
        returns (
            address[2] memory _participants,
            bytes32[2] memory _boards,
            uint256 _turnNonce,
            uint256[2] memory _hitNonce,
            GameStatus _status,
            address _winner
        );
}
