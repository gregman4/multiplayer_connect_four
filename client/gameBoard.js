/**
 * This is a module to create a connect four game board, and render updated
 * versions of this board.  For this board we will use a 2d array.  The following
 * 2d array will represent an board that has a single red piece dropped in the middle
 * column:
 *
 * [
 *    ['blank', 'blank', 'blank', 'blank', 'blank', 'blank', 'blank'],
 *    ['blank', 'blank', 'blank', 'blank', 'blank', 'blank', 'blank'],
 *    ['blank', 'blank', 'blank', 'blank', 'blank', 'blank', 'blank'],
 *    ['blank', 'blank', 'blank', 'blank', 'blank', 'blank', 'blank'],
 *    ['blank', 'blank', 'blank', 'blank', 'blank', 'blank', 'blank'],
 *    ['blank', 'blank', 'blank', 'blank', 'blank', 'blank', 'blank'],
 *    ['blank', 'blank', 'blank', 'red',   'blank', 'blank', 'blank']
 * ]
 *
 * You can see that each inner array is a row.  The strings in each inner array
 * represent the state of each slot in the row.  'blank' means that there has been
 * no move there and it will be drawn as white on the UI.  'red' means that the red
 * player holds this spot and it will be drawn on the UI as red.  'blue' means that
 * the blue player holds this spot and it will be drawn on the UI as blue.
 *
 * @author  Jake Dean <jbd74@cornell.edu>
 */

// Just map the owners of each slot on the board to thier hex code for rendering the
// correct color.
var colorToHexMapper = {
  'blank': '#fff',
  'red'  : '#f00',
  'blue' : '#00f'
}

// 7 columns and 6 rows on a connect four board.
var NUM_COLS_ON_BOARD = 7;
var NUM_ROWS_ON_BOARD = 6;

// The arrays of columns and rows are 0 indexed so to avoid doing " rows - 1" in the
// code I will add these constants to get the max index for rows and cols.  Not required
// just to keep things cleaner.
var MAX_COL_INDEX = 6;
var MAX_ROW_INDEX = 5;

// Get our canvas and context so we can draw on the canvas.
var myCanvas = document.getElementById('gameBoard');
var ctx = myCanvas.getContext('2d');

/**
 * Create our 2d array representation of the game board and render it on the
 * screen for the user to see the blank board.
 *
 * @return {Array} The game state array so the consumer can have it for logic it wants to
 *                 carry out to decide of moves players are trying to make are legal.
 */
function createGameBoard () {
  var gameState = [];
  // First add our empty rows
  for (var rowIndex = 0; rowIndex <= MAX_ROW_INDEX; rowIndex++) {
    gameState.push([]);
    // Then add the columns to this row.
    for (var colIndex = 0; colIndex <= MAX_COL_INDEX; colIndex++) {
      gameState[rowIndex].push('blank');
    }
  }
  // Now we will just pass this game state to our render board function so the user
  // can see the blank board on the screen.
  renderBoard(gameState);
  return gameState;
}


/**
* We are going to go through the game state and color in the pieces correctly
* based on whether they are blank -> white, the blue player has moved there
* -> blue, or the red player has moved there -> red.
*
* @param {Array} gameState The 2d array representing the game board.
*/
function renderBoard(gameState) {
  var colWidth = myCanvas.width / NUM_COLS_ON_BOARD;
  var rowHeight = myCanvas.height / NUM_ROWS_ON_BOARD;
  // We will now loop through each slot on the board and render the correct slot color.
  for (var rowIndex = 0; rowIndex <= MAX_ROW_INDEX; rowIndex++) {
    for (var colIndex = 0; colIndex <= MAX_COL_INDEX; colIndex++) {
      // For this slot we need to set the fill color then draw the fill.
      var slotStatus = gameState[rowIndex][colIndex];
      // Now we need to get the x,y coordinate for the top left corner of the
      // slot we are about to draw.
      var topLeftX = colIndex * colWidth;
      var topLeftY = rowIndex * rowHeight;
      // Set the fill style, stroke style (we want to outline of the box to be black always)
      // draw the box and fill it with the correct color based on who owns this game slot.
      ctx.fillStyle = colorToHexMapper[slotStatus];
      //ctx.fillRect(topLeftX, topLeftY, colWidth, rowHeight);
      //ctx.strokeRect(topLeftX, topLeftY, colWidth, rowHeight);
      ctx.beginPath();
      ctx.arc(topLeftX+colWidth/2, topLeftY+rowHeight/2, colWidth/2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = colorToHexMapper['black'];
    }
  }
}

// Expose this API to the consumer of this module.
module.exports = {
  createGameBoard  : createGameBoard,
  renderBoard      : renderBoard,
  NUM_ROWS_ON_BOARD: NUM_ROWS_ON_BOARD,
  NUM_COLS_ON_BOARD: NUM_COLS_ON_BOARD,
  MAX_ROW_INDEX    : MAX_ROW_INDEX,
  MAX_COL__INDEX   : MAX_COL_INDEX
}
