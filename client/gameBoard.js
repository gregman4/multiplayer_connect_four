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