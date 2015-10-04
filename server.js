/**
 * This is a server for a multiplayer connect four game that will listen to clients
 * with socket.io and send the move to the opposing client.
 *
 * @author  Jake Dean <jbd74@cornell.edu>
 */
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

/**
 * This games object will have keys for the names of the games, and values that will be
 * objects that will contain the current turn color for the game and an array of players
 * which will be the socket objects for the two players in the game.
 * {
 *   jakes_game : {
 *     currentTurnColor : 'blue',
 *     players          : [{socket connection 1}, {socket connection 2}]
 *   },
 *   tonys_game: ....
 * }
 */
var games = {};

server.listen(process.env.PORT || 80);
// Just using express here to serve the static index.html file, the rest will happen with sockets.
app.use(express.static(__dirname));

// Listen for new connections and then set them up and bind all the socket listeners by calling
// the initPlayerSocket function.
io.on('connection', initPlayerSocket);

/**
 * This will be called when we get a new socket connection to our server.  We will make
 * bindings to the socket events for:
 * 1. getting the list of open games for a user so they can choose a game to join.
 * 2. create a new game on the server for the user to join.
 * 3. add a player to the game they have chosen
 * 4. make a move for the player
 *
 * I am going to define functions to handle the events in here because I want them to have
 * scope to the socket that was just added.
 *
 * @param  {Object} The socket object for the user that is trying to connect to the game.
 */
function initPlayerSocket(socket) {

  // First I will define all of the functions that are going to be needed to respond
  // to the socket events.  After these function definitions I will make the socket
  // bindings.

  /**
   * Get the list of open games and package into array and send out to just this socket.
   */
  function getListOfOpenGames() {
    socket.emit('displayListOfGames', {openGameNames: getOpenGamesArray()})
  }

  /**
   * Collect an array of game names that have at least one spot remaining.  If the game has
   * two players in it already we will not show the user that game because it is full.
   *
   * @return {Array} An array of strings for all of the open games.
   */
  function getOpenGamesArray() {
    var openGameNames = [];
    for (var gameName in games) {
      // Make sure we are not going to the objects primitive properties.
      if (games.hasOwnProperty(gameName) && games[gameName].players.length < 2) {
        openGameNames.push(gameName);
      }
    }
    return openGameNames;
  }

  /**
   * Try to create a new game, if there is an existing game with that name we will emit
   * the fail event, if we create the game we will have to tell all of the sockets about
   * the new game so they can update thier dropdown game list.
   *
   * @param  {String} gameName The name of the game the user is trying to create.
   */
  function createNewGame (gameName) {
    if (!games.hasOwnProperty(gameName)) {
      // Init this game with a spot to hold the player sockets, and set the current
      // turn to blue (This decision for blue is arbitrary but we need someone to go first.)
      games[gameName] = {players: [], currentTurnColor: 'blue'};
      // We will let all of the connected sockets know about this new game by giving them
      // the updated list of open games, this will allow them to update the games dropdown
      // on the UI.
      io.emit('displayListOfGames', {openGameNames: getOpenGamesArray()});
      // Let this socket who has called to create the new game know that it was created.
      socket.emit('gameCreated');
    } else {
      // There was a game on the server with this name already, game names need to be unique so
      // we will tell the user that they need a new game name.
      socket.emit('failedToCreateGame');
    }
  }

  /**
   * We are going to add this player to the game they have selected.  If that game is full
   * we will emit the failed to add player event and the client will tell the user to pick
   * another game.  If this game is ok to join we will assign them a color, add them to
   * the players array for this game.  If this game has two players we will emit the game
   * starting event so the clients will allow the users to begin making moves.
   *
   * @param {String} gameName The name of the game the user is looking to join.
   */
  function addPlayerToGame (gameName) {
    if (games[gameName] && (games[gameName].players.length < 2)) {
      // Ok we are adding this player to the game they wanted because there was an open slot.
      // We will store the game name that they are a part of on the socket object.
      socket.gameName = gameName;
      games[gameName].players.push(socket);
      // Now we will see what index we just added, index 0 will be blue, 1 will be red (arbitrary).
      var playerIndex = games[gameName].players.indexOf(socket);
      var playerColor = (playerIndex === 0) ? 'blue' : 'red';
      socket.playerColor = playerColor;
      // Tell the client what color this player has been assigned.
      socket.emit('playerAddedToGame', {playerColor: playerColor, gameName: gameName});

      // If there are now two players in this game we need to tell all of the players
      // in this game that the game is about to start.
      if (games[gameName].players.length === 2) {
        for (var i = 0; i < games[gameName].players.length; i++) {
          games[gameName].players[i].emit('gameStarted', {currentTurnColor: games[gameName].currentTurnColor});
        }
      }
    } else {
      // This game is full, the user will need to choose another one.
      socket.emit('failedToAddPlayer');
    }
  }

  /**
   * Send this new game state out to both players in this game.  Once we have done that
   * we need to check if the game is over (four in a row or a full board), if so we will
   * also emit that event out to all the clients in the game.
   *
   * @param  {Object} gameInfo An object with keys for currentTurnColor, and gameState.
   *                           gameState is the 2d array representation of the game board.
   */
  function playerMove (gameInfo) {
    // First thing we need to do is now flip the current move to the other player.
    var newTurnColor = (games[socket.gameName].currentTurnColor === 'blue') ? 'red' : 'blue';
    games[socket.gameName].currentTurnColor = newTurnColor;
    // Let all of the players in this game know about the new game state.
    for (var i = 0; i < games[socket.gameName].players.length; i++) {
      games[socket.gameName].players[i].emit(
          'gameStateUpdate',
          {currentTurnColor: newTurnColor, gameState: gameInfo.gameState}
      );
    }
    // Now with this new game state we need to check if the game is over (four in
    // a row or a full board.)
    if (isGameOver(gameInfo.gameState)) {
      for (var i = 0; i < games[socket.gameName].players.length; i++) {
        games[socket.gameName].players[i].emit('gameOver');
      }
    }
  }

  // Now I will make the socket bindings to all of the events the client might send us.

  // When the client wants to display the names of the open games we will collect all of the names
  // and return them so the client has a chance to join a new game.
  socket.on('getListOfOpenGames', getListOfOpenGames);

  // Try to create a new game and emit the success or fail event.
  socket.on('createNewGame', createNewGame);

  // Add a player to the game they want to join, emit the success or fail event.
  socket.on('addPlayerToGame', addPlayerToGame);

  // Listen for when a player wants to make a move, emit the new gamestate to the players
  // in that game and see if there is a winner yet.
  socket.on('playerMove', playerMove);
}

/**
 * Check to see if the game is over.  This means see if the board is full first.  Then
 * if not we have to check to see if either player has four in a row.  We will check the rows
 * then the columns, and the all of the diagonals.  I know I am making more loops than I need
 * to but I am trading off some performance for readability and doing things one step at a time.
 * I am defining this outside of the initPlayerSocket function because it does not need reference
 * to any certain socket, it just takes a game state and returns true or false so I decided to
 * define this helper outside.
 *
 * @param  {Array}  gameState A 2d array where each inner array is an array of strings, where the
 *                            strings can be 'blue', 'red' or 'blank'.
 * @return {Boolean} True if the game is over, false otherwise.
 */
function isGameOver(gameState) {
  // If the game board is full then the game is over and we don't need to look any further.  We
  // can know if the board is full if there are no blanks on the highest board row.
  if (gameState[0].indexOf('blank') < 0) {
    return true;
  }
  // First we will check all of the rows to see if we have four in a row of one color.
  for (var row = 0; row <  gameState.length; row++) {
    var rowString = gameState[row].join();
    if (rowString.match(/red,red,red,red/) || rowString.match(/blue,blue,blue,blue/)) {
      return true;
    }
  }
  // Now we will check the columns to see if we have four in a row.
  for (var col = 0; col < gameState[0].length; col++) {
    // Get all of the pieces for the current column we are looking at.  This will mean
    // looking at all of the rows for this current column.
    var currentColumnArray = [];
    for (var row = 0; row < gameState.length; row++) {
      currentColumnArray.push(gameState[row][col]);
    }
    // Now we will see if for this column there are four in a row.
    var currentColumnString = currentColumnArray.join();
    if (currentColumnString.match(/red,red,red,red/) || currentColumnString.match(/blue,blue,blue,blue/)) {
      return true;
    }
  }
  // Now we will check the diagonals, these if conditions are a little repetitive but I think
  // this logic would become more confusing if it was factored out into a more general function.
  for (var row = 0; row < gameState.length; row++) {
    for (var col = 0; col < gameState[row].length; col++) {
      // Look diagonal right downward from this current piece.
      if (gameState[row+3] && gameState[row+3][col+3]) {
        var diagRight = [gameState[row][col], gameState[row+1][col+1], gameState[row+2][col+2], gameState[row+3][col+3]];
        var diagRightString = diagRight.join();
        if (diagRightString.match(/red,red,red,red/) || diagRightString.match(/blue,blue,blue,blue/)) {
          return true;
        }
      }
      // Now we will check the diag left way.
      if (gameState[row-3] && gameState[row-3][col-3]) {
        var diagLeft = [gameState[row][col], gameState[row-1][col-1], gameState[row-2][col-2], gameState[row-3][col-3]];
        var diagLeftString = diagLeft.join();
        if (diagLeftString.match(/red,red,red,red/) || diagLeftString.match(/blue,blue,blue,blue/)) {
          return true;
        }
      }
    }
  }
  // There were no winning moves if we got here, return false because the game is not over.
  return false;
}