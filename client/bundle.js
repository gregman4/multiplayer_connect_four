require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/client/gameBoard.js":[function(require,module,exports){
/**
 * This is a client for a multiplayer connect four game.  The client will be in charge of
 * showing the user what games are available to join, letting the user create a new game,
 * letting the user set their name for game play and rendering the board.
 *
 * @author  Jake Dean <jbd74@cornell.edu>
 */

var colorToHexMapper = {
	'blank': '#fff',
	'red'  : '#f00',
	'blue' : '#00f'
}

var myCanvas = document.getElementById('gameBoard');
var ctx = myCanvas.getContext('2d');

/**
 * We first are going to need to create the game board.  The state of the game will be kept
 * in a 2d array.  There are 6 rows in a connect four board and 7 columns in each row.  So
 * the data structure we have here is going to be an outer array with 6 inner arrays in it.
 * It will look like this:
 * [
 * 		['blank', 'blank', 'blank', 'blank', 'blank', 'blank', 'blank'],
 * 		... (5 more arrays like the first index above.)
 * ]
 */
function createGameBoard () {
	var gameState = [];
	// First add our rows
	for (var i = 0; i < 6; i++) {
		gameState.push([]);
		// Then add the columns to this row.
		for (var j = 0; j < 7; j++) {
			gameState[i].push('blank');
		}
	}
	// Now we will draw the outline of the board with of course no moves made because this
	// is a fresh game.
	ctx.strokeRect(0,0, myCanvas.width, myCanvas.height);
	// Now we are going to draw the vertical lines on the board.
	var colWidthInPixels = myCanvas.width / 7;
	for (var i = 0; i < myCanvas.width; i+= colWidthInPixels) {
		ctx.beginPath();
		ctx.moveTo(i, 0);
		ctx.lineTo(i, myCanvas.height);
		ctx.closePath();
		ctx.stroke();
	}
	// Now we are going to draw the horizontal lines on the board, I know this code is repeated a little
	// bit from the above code but the height and width stuff can get confusing so I am making the
	// call to just have it more straightforward and hardcoded.
	var colHeightInPixels = myCanvas.height / 6;
	for (var j = 0; j < myCanvas.height; j+= colHeightInPixels) {
		ctx.beginPath();
		ctx.moveTo(0, j);
		ctx.lineTo(myCanvas.width, j);
		ctx.closePath();
		ctx.stroke();
	}
	return gameState;
}


/**
* We are going to go through the game state and color in the pieces correctly
* based on whether they are open -> white, the black player has moved there
* -> black, or the red player has moved there -> red.
*/
function renderBoard(gameState) {
	var colWidth = myCanvas.width / 7;
	var rowHeight = myCanvas.height / 6;
	for (var row = 0; row < gameState.length; row++) {
		for (var col = 0; col < gameState[row].length; col++) {
			// For this slot we need to set the fill color then draw the fill.
			var slotStatus = gameState[row][col];
			var topLeftX = col * colWidth;
			var topLeftY = row * rowHeight;
			ctx.fillStyle = colorToHexMapper[slotStatus];
			ctx.fillRect(topLeftX, topLeftY, colWidth, rowHeight);
			ctx.strokeRect(topLeftX, topLeftY, colWidth, rowHeight);
			ctx.strokStyle = colorToHexMapper['black'];
		}
	}
}

module.exports = {
	createGameBoard: createGameBoard,
	renderBoard: renderBoard
}
},{}],1:[function(require,module,exports){
/**
 * This module will handle the game initialization when a user goes to the index page.
 * When everything is loaded it will show all of the games that are available to join
 * on the server or let a user create their own game.  Then once you have joined a game
 * it will ask you what name you would like to use.  This will also handle the listener
 * to tell the players that the game is over.
 *
 * @author  Jake Dean <jbd74@cornell.edu>
 */

window.addEventListener('DOMContentLoaded', function () {
	// Connect to the same address the server is on.
	var socket = io('/');
	var gameBoard = require('./gameBoard.js');
	var gameJoined, playerColor, currentTurnColor;

  // First thing we are going to do is render the game board to the screen.
	var gameState = gameBoard.createGameBoard();

	// Next we will go fetch the list of existing games from the server that the
	// user can join.
	socket.emit('getListOfOpenGames');

	// Next we are going to bind the UI event listeners.
	bindUiListeners();

	// Last we are going to bind the socket event listeners that will listen
	// for events that the server sends us over the socket.
	bindSocketListeners();

	/**
	 * Listen for when the user wants to create a new game, join a game or
	 * click on the game board to make a move.  All of the DOM bindings are
	 * related to I want to make the bindings in this function.
	 */
	function bindUiListeners() {
		// This will listen for when a user wants to create a new game.
		document.getElementById('add_game').addEventListener('click', function() {
			var newGameName = document.getElementById('new_game_name').value;
			console.log(newGameName);
			if (newGameName) {
				socket.emit('createNewGame', newGameName);
			} else {
				window.alert('In order to create a new game you must enter in a name for the game.');
			}
		});

		// Once a user is ready to join a game from the dropdown list of available games
		// we will emit an event to add them to the game they wanted to.
		document.getElementById('join_selected_game').addEventListener('click', function() {
			var gameToJoin = document.getElementById('open_games_list').value;
			if (gameToJoin) {
				socket.emit('addPlayerToGame', gameToJoin);
			} else {
				window.alert('You must choose a game name in order to join one.');
			}
		});

		// We will need to listen for when the user clicks the game board.
		document.getElementById('gameBoard').addEventListener('click', listenForMoves);
	}

	/**
	 * This function will listen for the player to click the screen.  Once they do
	 * they will collect to coordinates that the player clicked and translate that
	 * into which slot we are going to try to make a move for this player.
	 * @param {Object} clickEvent The click event on the canvas (This means the user is trying to move.)
	 */
	function listenForMoves (clickEvent) {
		// Now we need to get the x and y position in pixels that the user has clicked and get
		// the column that this click would be associated with.
		var moveCoordinates = {x: clickEvent.clientX, y: clickEvent.clientY};
		var columnWidthInPixels = document.getElementById('gameBoard').width / 7;
		// We need to subtract one because the arrays are 0 indexed.
		var columnIndex = Math.floor(moveCoordinates.x / columnWidthInPixels);
		if (playerColor && (playerColor === currentTurnColor)) {
			// We are now going to go through the board and see if we can move the player
			// to the column they wanted to.  Becasue in connect four you drop the piece and
			// it ends up and the lowest slot in the column you drop it in we are going to count
			// up from the bottom of each column and select the first open slot.
			for (var row = 5; row >= 0; row--) {
				if (gameState[row][columnIndex] === 'blank') {
					// Woo woo this spot is blank and the user can move here.
					gameState[row][columnIndex] = playerColor;
					gameBoard.renderBoard(gameState);
					socket.emit('playerMove', {currentTurnColor: currentTurnColor, gameState: gameState})
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
   * Make all of the socket bindings we need so we can be aware of the server events an update
   * the UI accordingly.
   */
	function bindSocketListeners() {
  	// We will need to listen to the games list socket event so we can show the
		// user the list of games that they can join.
		socket.on('displayListOfGames', displayListOfGames);

  	socket.on('gameCreated', function(gamesListObject) {
			displayListOfGames(gamesListObject);
			window.alert('Your game has been created on the server, be sure to join it by clicking it now.');
		});

		socket.on('playerAddedToGame', function(playerInfoObject) {
			gameJoined = playerInfoObject.gameName;
			playerColor = playerInfoObject.playerColor;
			window.alert('You have been added to the ' + gameJoined + ' game, your color is ' + playerColor + '.');
			var colorText = 'Your Color: <input type="text" disabled value="' + playerColor + '">';
			document.getElementById('player_color_placeholder').innerHTML = colorText;
		})

		socket.on('gameStarted', function(initGameObject) {
			currentTurnColor = initGameObject.currentTurnColor;
			window.alert('The game has begun, player ' + currentTurnColor + ' plays first.');
			var currentTurnHtml = 'Current Turn Color: <input type="text" disabled value="' + currentTurnColor + '">';
			document.getElementById('current_turn_color_placeholder').innerHTML = currentTurnHtml;
		});

		socket.on('gameStateUpdate', function(gameInfo) {
			gameState = gameInfo.gameState;
			console.log(gameInfo.gameState);
			currentTurnColor = gameInfo.currentTurnColor;
			gameBoard.renderBoard(gameState);
			var currentTurnHtml = 'Current Turn Color: <input type="text" disabled value="' + currentTurnColor + '">';
			document.getElementById('current_turn_color_placeholder').innerHTML = currentTurnHtml;
		})

		socket.on('gameOver', function() {
			window.alert('The game is over, please refresh the page to play again.');
		});
	}

  /**
   * This will render the select menu of the available games that the user can join.
   *
   * @param {Object} gamesListObject An object with a key for openGameNames whose value is
   *                                 an array of game name strings.
   */
	function displayListOfGames(gamesListObject) {
		var gamesListArray = gamesListObject.openGameNames;
		var gamesListMenu = '<select id="open_games_list"><option>Select Existing Game</option>';
		for (var gameName = 0; gameName < gamesListArray.length; gameName++) {
			gamesListMenu += '<option value ="' + gamesListArray[gameName] + '">' + gamesListArray[gameName] + '</option>';
		}
		gamesListMenu += '</select>';
		document.getElementById('game_name_placeholder').innerHTML = gamesListMenu;
	}
});
},{"./gameBoard.js":"/client/gameBoard.js"}]},{},[1]);
