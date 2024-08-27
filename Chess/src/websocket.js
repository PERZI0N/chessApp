let socket;
let setBoard;
let setCurrentTurn;
let connectionEstablished = false;


export const connectWebSocket = (callbacks) => {
  return new Promise((resolve, reject) => {
    socket = new WebSocket("ws://localhost:8080");

    socket.onopen = () => {
      console.log("WebSocket connection established");
      connectionEstablished = true;
      resolve();
    };

    socket.onclose = (event) => {
      console.log("WebSocket connection closed", event);
      connectionEstablished = false;
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      reject(error);
    };

    socket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      handleServerMessage(data);
    };
  });
};

export const sendMove = (move) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "makeMove", move }));
  } else {
    console.error("WebSocket connection is not open.");
  }
};

export const initializeGame = (playerASetup, playerBSetup) => {
  if (connectionEstablished) {
    console.log("Sending initializeGame message");
    socket.send(
      JSON.stringify({
        type: "initializeGame",
        playerASetup: playerASetup,
        playerBSetup: playerBSetup,
      })
    );
  } else {
    console.error(
      "WebSocket connection is not open. Attempting to reconnect..."
    );
    connectWebSocket()
      .then(() => {
        initializeGame(playerASetup, playerBSetup);
      })
      .catch((error) => {
        console.error("Failed to reconnect:", error);
      });
  }
};

export const isConnected = () => connectionEstablished;

// Handle server messages
function handleServerMessage(message) {
  switch (message.type) {
    case "gameStateUpdate":
      updateGameState(message.payload);
      break;

    case "invalidMove":
      alert(`Invalid move: ${message.payload}`);
      break;

    case "gameOver":
      alert(`Game over! Winner: ${message.payload.winner}`);
      resetGame();
      break;

    default:
      console.log("Unknown message type:", message.type);
      break;
  }
}

// Update the game state
function updateGameState(newState) {
  if (setBoard && setCurrentTurn) {
    setBoard(newState.board);
    setCurrentTurn(newState.currentTurn);
  } else {
    console.error("setBoard or setCurrentTurn is not defined");
  }
}

// Reset the game state
function resetGame() {
  if (setBoard && setCurrentTurn) {
    setBoard(Array(5).fill(Array(5).fill(null)));
    setCurrentTurn("A");
  } else {
    console.error("setBoard or setCurrentTurn is not defined");
  }
}
