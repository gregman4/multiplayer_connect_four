/**
 * This is a server for a multiplayer connect four game that will listen to clients
 * with socket.io and send the move to the opposing client.  For this simple version of
 * this I will only allow the server to have two connections at a time.
 *
 * @author  Jake Dean <jbd74@cornell.edu>
 */
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

// This connections object will have keys for the names of the games, and values that will be
// arrays of the conections that are in that game.  So it might look like this with one game
// in it:
// {
//   jakes_game : {
//     'currentTurnColor' : 'blue',
//     'players' : [...socket connection 1 ...], [... socket connection 2 ...]
//     },
//   tonys_game: ....
// }
var games = {};

// Have the server listen to the port that Heroku uses or listen on 3000 when I am working locally.
server.listen(process.env.PORT || 80);
// When someone comes to the base url we will server the index.html, if they come to some other
// url like base_url/some_page then express will render the page with an error message.
app.use(express.static(__dirname));

io.on('connection', initPlayerSocket);
/**
 * As we get connections we are going to add to our connections array.  We are only
 * going to accept a total of two connections for now just to keep things simple.
 *
 * @param  {Object} The socket object for the client that is trying to connect to the game.
 */
function initPlayerSocket(socket) {
	socket.on('getListOfOpenGames', function() {
		socket.emit('displayListOfGames', {openGameNames: getOpenGamesArray()})
	});

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

	// If a game with this name does not exist we will create one and set the current move to black.
	socket.on('createNewGame', function(gameName) {
		if (!games.hasOwnProperty(gameName)) {
			games[gameName] = {};
			// Add the array so it can hold the sockets for this game.
			games[gameName].players = [];
			games[gameName].currentTurnColor = 'blue';
			socket.emit('gameCreated', {openGameNames: getOpenGamesArray()});
		} else {
			socket.emit('failedToCreateGame');
		}
	});

	socket.on('addPlayerToGame', function (gameName) {
		if (games[gameName].players.length < 2) {
			games[gameName].players.push(socket);
			socket.gameName = gameName;
			// Now we will see what index we just added, index 0 will be blue, 1 will be red.
			var playerIndex = games[gameName].players.indexOf(socket);
			var playerColor = (playerIndex === 0) ? 'blue' : 'red';
			socket.playerColor = playerColor;
			socket.emit('playerAddedToGame', {playerColor: playerColor, gameName: gameName});

		  // Both of the names are set for the players, now we are going to go to both
		  // of the clients and tell them that the game is starting.
		  if (games[gameName].players.length === 2) {
		  	for (var i = 0; i < games[gameName].players.length; i++) {
			   	games[gameName].players[i].emit('gameStarted', {currentTurnColor: games[gameName].currentTurnColor});
			  }
		  }
		}
	});

	socket.on('playerMove', function(gameInfo) {
		// First thing we need to do is now flip the current move to the other player.
		if (gameInfo.currentTurnColor === games[socket.gameName].currentTurnColor) {
			var newTurnColor = (games[socket.gameName].currentTurnColor === 'blue') ? 'red' : 'blue';
			games[socket.gameName].currentTurnColor = newTurnColor;
			for (var i = 0; i < games[socket.gameName].players.length; i++) {
				games[socket.gameName].players[i].emit(
					  'gameStateUpdate',
					  {currentTurnColor: newTurnColor, gameState: gameInfo.gameState}
				);
			}
			// First thing we will do is check if the game is over, ie, someone has won or the
			// board is full.
			if (isGameOver(gameInfo.gameState)) {
				for (var i = 0; i < games[socket.gameName].players.length; i++) {
					games[socket.gameName].players[i].emit('gameOver');
				}
			}
		} else {
			socket.emit('playerNotAllowedToMove');
		}
	});
}

/**
 * Check to see if the game is over.  This means see if the board is full first.  Then
 * if not we have to check to see if either player has four in a row.  We will check the rows
 * then the columns, and the all of the diagonals.  I know I am making more loops than I need
 * to but I am trading off some performance for readability and doing things one step at a time.
 *
 * @param  {Array}  gameState A 2d array where each index is an array of string representing the colors.
 * @return {Boolean} True if the game is over, false otherwise.
 */
function isGameOver(gameState) {
	// To check if the game is over with no winner all we have to do is check and see if there are
	// no available moves in the top row.
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
		// create an array for all of the colors in the current column.
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
	return false;
}