/**
 * This module will handle the game initialization when a user goes to the index page.
 * When everything is loaded it will show all of the games that are available to join
 * on the server or let a user create thier own game.  Once there are two players in the
 * game the user has joined the UI will tell the user the game has begun and it will allow
 * each player to take turns making moves.
 *
 * @author  Jake Dean <jbd74@cornell.edu>
 */

window.addEventListener('DOMContentLoaded', function () {
  // Connect to the same address the server is on.
  var socket = io('/');
  var gameBoard = require('./gameBoard.js');
  // These variables will be populated when the user joins a game, gets a color and
  // once the game is started.  I want them to be visible to all of the functions in this
  // module though so I define them here.
  var gameJoined, playerColor, currentTurnColor;

  // Render the initial board to the screen on page load, and get back the blank game state.
  var gameState = gameBoard.createGameBoard();

  // Next we are going to bind the UI event listeners.
  bindUiListeners();

  // Next we are going to bind the socket event listeners that will listen
  // for events that the server sends us over the socket.
  bindSocketListeners();

  // Last we will go fetch the list of existing games from the server that the
  // user can join.
  socket.emit('getListOfOpenGames');

  /**
   * The user wants to add a new game, make sure they have given a name in the new game
   * name input box, and then if so emit the socket event to the server to create the game.
   */
  function createNewGame() {
    var newGameName = document.getElementById('new_game_name').value;
    if (newGameName) {
      socket.emit('createNewGame', newGameName);
    } else {
      window.alert('In order to create a new game you must enter in a name for the game.');
    }
  }

  /**
   * If the user has selected a game from the dropdown list of games then
   * emit the event to the server that this user wants to join a game.  Pass the
   * name of the game to the server so it can add the player.
   */
  function joinSelectedGame() {
    var gameToJoin = document.getElementById('open_games_list').value;
    if (gameToJoin) {
      socket.emit('addPlayerToGame', gameToJoin);
    } else {
      window.alert('You must choose a game name in order to join one.');
    }
  }

  /**
   * This function will be called when the user tries to make a move.  First we need to
   * make sure it is this player's turn to move, if so then we will need to grab the
   * click info and translate that into which column was clicked.  Once we have the column
   * we can make a check to see if that colunm is open.  If this column is open then we will
   * make the move there, repaint the board for this user then send the updated game state to the
   * server to be send out to the other player in the game.
   *
   * @param {Object} clickEvent The click event on the canvas (which has x and y coordinates)
   */
  function makeMove (clickEvent) {
    if (playerColor && (playerColor === currentTurnColor)) {
      // If the board is 700 px that means each column is 100 px (7 cols on board).  If the user clicks
      // on 250 px from the left edge of the page that means they are clicking in the
      // third column in from the left as seen from the users perspective.  We need to map this
      // to the game board array so we divide by the column width 100 to get 2.5.  Last becuase
      // the array is 0 indexed we will round this down with Math.floor to get 2.  That is how
      // we will be mapping clicks to the underlying game state array.
      var columnWidthInPixels = document.getElementById('gameBoard').width / gameBoard.NUM_COLS_ON_BOARD;
      var columnIndex = Math.floor(clickEvent.clientX / columnWidthInPixels);

      // We are now going to go through the board and see if we can move the player
      // to the column they wanted to.  Becasue in connect four you drop the piece and
      // it ends up and the lowest slot in the column you drop it in we are going to count
      // up from the bottom of each column and select the first open slot.
      for (var row = gameBoard.MAX_ROW_INDEX; row >= 0; row--) {
        if (gameState[row][columnIndex] === 'blank') {
          // Woo woo this spot is blank and the user can move here.
          gameState[row][columnIndex] = playerColor;
          gameBoard.renderBoard(gameState);
          socket.emit('playerMove', {currentTurnColor: currentTurnColor, gameState: gameState});
          return;
        }
      }
      // That was not a valid move because there were no blanks in the column that you tried to
      // click on, so we will tell the user.
      window.alert('There are no open spaces in that column, please try again.');
    } else {
      window.alert('It is not your turn to go, please wait.');
    }
  }

  /**
   * Listen for when the user wants to create a new game, join a game or
   * click on the game board to make a move.  Bind these all to the functions
   * we want to fire for each event.
   */
  function bindUiListeners() {
    // This will listen for when a user wants to create a new game.
    document.getElementById('add_game').addEventListener('click', createNewGame);
    // Once a user is ready to join a game from the dropdown list of available games
    // we will emit an event to add them to the game they wanted to.
    document.getElementById('join_selected_game').addEventListener('click', joinSelectedGame);
    // We will need to listen for when the user clicks the game board.
    document.getElementById('gameBoard').addEventListener('click', makeMove);
  }

  /**
   * Ok this player has been added to a game, we have the color they will be playing as too, so update
   * those variables, let the player know with an alert and add thier color to the right side of the
   * screen.
   *
   * @param  {Object} playerInfoObject An object from the server with keys for gameName and playerColor
   *                                   The player color will be red or blue.
   */
  function updateUiForAddedPlayer (playerInfoObject) {
    gameJoined = playerInfoObject.gameName;
    playerColor = playerInfoObject.playerColor;
    window.alert('You have been added to the ' + gameJoined + ' game, your color is ' + playerColor + '.');
    var colorText = 'Your Color: <input type="text" disabled value="' + playerColor + '">';
    document.getElementById('player_color_placeholder').innerHTML = colorText;
  }

  /**
   * The server has told us whose turn it is to move now (red or blue) so we can let the user know
   * the game has started and update the left side of the screen to show the current move color.
   *
   * @param  {Object} initGameObject An object with a key for the current turn color (whose turn it is.)
   */
  function updateUiForGameStarted(initGameObject) {
    currentTurnColor = initGameObject.currentTurnColor;
    window.alert('The game has begun, player ' + currentTurnColor + ' plays first.');
    var currentTurnHtml = 'Current Turn Color: <input type="text" disabled value="' + currentTurnColor + '">';
    document.getElementById('current_turn_color_placeholder').innerHTML = currentTurnHtml;
  }

  /**
   * There is a new game state so render that new state, also change the current turn color
   * because now it is the other player's chance to play.
   *
   * @param  {Object} gameInfo Object from the server with keys for the game state (The 2d array representing
   *                           the board) and the current turn color.
   */
  function updateUiForGameStateUpdate(gameInfo) {
    gameState = gameInfo.gameState;
    currentTurnColor = gameInfo.currentTurnColor;
    gameBoard.renderBoard(gameState);
    var currentTurnHtml = 'Current Turn Color: <input type="text" disabled value="' + currentTurnColor + '">';
    document.getElementById('current_turn_color_placeholder').innerHTML = currentTurnHtml;
  }

  /**
   * This will render the select menu of the available games that the user can join.
   *
   * @param {Object} gamesListObject An object with a key for openGameNames whose value is
   *                                 an array of game name strings.
   */
  function displayListOfGames(gamesListObject) {
    var gamesListArray = gamesListObject.openGameNames;
    var gamesListMenu = '<select id="open_games_list"><option value="">Select Existing Game</option>';
    for (var gameName = 0; gameName < gamesListArray.length; gameName++) {
      gamesListMenu += '<option value ="' + gamesListArray[gameName] + '">' + gamesListArray[gameName] + '</option>';
    }
    gamesListMenu += '</select>';
    document.getElementById('game_name_placeholder').innerHTML = gamesListMenu;
  }

  /**
   * Make all of the socket bindings we need so we can be aware of the server events and update
   * the UI accordingly.
   */
  function bindSocketListeners() {

    // We will need to listen to the games list socket event so we can show the
    // user the list of games that they can join.
    socket.on('displayListOfGames', displayListOfGames);

    // When the game the user wanted to create has been successfully created we will
    // let the user know that they are free to join it now.
    socket.on('gameCreated', function(gamesListObject) {
      var msg = 'Your game has been created on the server, be sure to join it by selecting';
      msg += ' it from the "Select Existing Game" dropdown and clicking "Join Game!".';
      window.alert(msg);
    });

    // Whoops, let the user know they tried to create a game with the same name as an existing game.
    socket.on('failedToCreateGame', function() {
      window.alert('There is already a game with that name, please try again.');
    });

    // The game might have been full (2 people in it), they need to try again.
    socket.on('failedToAddPlayer', function() {
      window.alert('That game was full, please try to join another game.');
    })

    // Let the user know they have been added to a game, and tell them what color they will
    // be playing as.
    socket.on('playerAddedToGame', updateUiForAddedPlayer);

    // Ok there are now two players in this game, tell this user that the game has started and put
    // the current color on the left side of the screen so the user knows whose turn it is.
    socket.on('gameStarted', updateUiForGameStarted);

    // There has been a player move and we have a new game state, so render the new state
    // and the current turn color has changed because now it is the other player's turn.
    socket.on('gameStateUpdate', updateUiForGameStateUpdate);

    // Game over, just tell the user, to keep it simple we will just have the user refresh the page
    // to play again.
    socket.on('gameOver', function() {
      window.alert('The game is over, please refresh the page to play again.');
    });
  }
});