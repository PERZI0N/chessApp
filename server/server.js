const WebSocket = require("ws");
const http = require("http");
const cors = require("cors");
const express = require("express");

// Create an express app
const app = express();

// Enable CORS for all routes
app.use(cors());

// Create an HTTP server using the Express app
const server = http.createServer(app);

// Create a WebSocket server by passing the HTTP server
const wss = new WebSocket.Server({ server });

// Your existing WebSocket code
wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    handleClientMessage(data, ws);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    // Handle client disconnection
  });
});

let clients = [];
let gameState = {
  board: [
    [
      { name: "Pawn", owner: "A", type: "Pawn" },
      null,
      null,
      null,
      { name: "Hero1", owner: "A", type: "Hero1" },
    ],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [
      { name: "Hero2", owner: "B", type: "Hero2" },
      null,
      null,
      null,
      { name: "Pawn", owner: "B", type: "Pawn" },
    ],
  ],
  currentTurn: "A",
}; // Stores the game state

server.on("connection", (socket) => {
  clients.push(socket);
  socket.on("message", (message) => {
    const data = JSON.parse(message);
    handleClientMessage(data, socket);
  });

  socket.on("close", () => {
    clients = clients.filter((client) => client !== socket);
  });
});

function broadcastGameState() {
  clients.forEach((client) => {
    client.send(JSON.stringify({ type: "gameState", state: gameState }));
  });
}

function handleClientMessage(data, socket) {
  switch (data.type) {
    case "initializeGame":
      initializeGame();
      broadcastGameState();
      break;
    case "makeMove":
      processMove(data.move);
      broadcastGameState();
      break;
    // Handle other message types (e.g., invalid move, game over) here
  }
}

function initializeGame(playerASetup, playerBSetup) {
  gameState = {
    board: Array(5)
      .fill(null)
      .map(() => Array(5).fill(null)),
    players: {
      A: { characters: playerASetup },
      B: { characters: playerBSetup },
    },
    currentTurn: "A",
  };

  // Place characters on the board
  placeCharactersOnBoard("A", 0);
  placeCharactersOnBoard("B", 4);

  broadcastGameState();
}

function placeCharactersOnBoard(player, row) {
  gameState.players[player].characters.forEach((char, index) => {
    gameState.board[row][index] = { name: char, owner: player, type: char };
  });
}

function processMove(move) {
  const { player, character, direction } = move;
  const board = gameState.board;
  const currentPlayer = gameState.currentTurn;

  // Ensure it's the correct player's turn
  if (player !== currentPlayer) {
    console.log("It's not your turn!");
    return;
  }

  // Find the character's current position on the board
  let charPosition = findCharacterPosition(character, player);

  if (!charPosition) {
    console.log("Character not found!");
    return;
  }

  // Calculate the new position based on the direction
  const [newRow, newCol] = calculateNewPosition(
    charPosition,
    direction,
    character
  );

  // Validate if the move is within bounds and not blocked
  if (!isValidMove(newRow, newCol, character)) {
    console.log("Invalid move!");
    return;
  }

  // Check for combat: if an opponent's character is in the new position, remove it
  const opponent = board[newRow][newCol];
  if (opponent && opponent.player !== player) {
    console.log(`${opponent.name} has been captured!`);
    removeCharacter(newRow, newCol); // Remove opponent's character
  }

  // Update the board: move the character to the new position
  board[charPosition[0]][charPosition[1]] = null; // Clear the old position
  board[newRow][newCol] = { ...character, player }; // Place the character in the new position

  // Update the gameState
  gameState.board = board;
  gameState.currentTurn = currentPlayer === "A" ? "B" : "A"; // Switch turns

  // Check for game over condition
  if (isGameOver()) {
    console.log(`Player ${currentPlayer} wins!`);
    // Handle game over logic here
  }
}

// Helper function to find the character's current position on the board
function findCharacterPosition(character, player) {
  for (let row = 0; row < gameState.board.length; row++) {
    for (let col = 0; col < gameState.board[row].length; col++) {
      const cell = gameState.board[row][col];
      if (cell && cell.name === character.name && cell.player === player) {
        return [row, col];
      }
    }
  }
  return null;
}

// Helper function to calculate the new position based on the move direction
function calculateNewPosition([row, col], direction, character) {
  switch (direction) {
    case "L":
      return [row, col - 1];
    case "R":
      return [row, col + 1];
    case "F":
      return [row - (character.name === "Hero1" ? 2 : 1), col];
    case "B":
      return [row + (character.name === "Hero1" ? 2 : 1), col];
    case "FL":
      return [row - 2, col - 2];
    case "FR":
      return [row - 2, col + 2];
    case "BL":
      return [row + 2, col - 2];
    case "BR":
      return [row + 2, col + 2];
    default:
      return [row, col];
  }
}

// Helper function to check if the move is valid
function isValidMove(row, col, character) {
  // Check if the move is within bounds
  if (row < 0 || row >= 5 || col < 0 || col >= 5) {
    return false;
  }

  // Add more validation logic if necessary (e.g., if the move is blocked by a friendly character)
  const targetCell = gameState.board[row][col];
  if (targetCell && targetCell.player === character.player) {
    return false; // Can't move to a space occupied by a friendly character
  }

  return true;
}

// Helper function to remove a character from the board
function removeCharacter(row, col) {
  gameState.board[row][col] = null;
}

// Helper function to check if the game is over
function isGameOver() {
  // The game is over if one player has no characters left
  const playerACharacters = findPlayerCharacters("A");
  const playerBCharacters = findPlayerCharacters("B");
  return playerACharacters.length === 0 || playerBCharacters.length === 0;
}

// Helper function to find all characters belonging to a player
function findPlayerCharacters(player) {
  let characters = [];
  for (let row = 0; row < gameState.board.length; row++) {
    for (let col = 0; col < gameState.board[row].length; col++) {
      const cell = gameState.board[row][col];
      if (cell && cell.player === player) {
        characters.push(cell);
      }
    }
  }
  return characters;
}

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
