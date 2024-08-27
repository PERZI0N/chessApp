import React, { useState, useEffect } from "react";
import { connectWebSocket, sendMove, initializeGame } from "../websocket";

const GameBoard = () => {
  const [board, setBoard] = useState(Array(5).fill(Array(5).fill(null)));
  const [currentTurn, setCurrentTurn] = useState("A");
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedCharacterPosition, setSelectedCharacterPosition] =
    useState(null);

  useEffect(() => {
    console.log("Setting up WebSocket connection...");
    connectWebSocket({
      onGameStateUpdate: handleGameStateUpdate,
      onInvalidMove: handleInvalidMove,
      onGameOver: handleGameOver,
    })
      .then(() => {
        console.log("Initializing game...");
        const playerASetup = ["Pawn", "Pawn", "Hero1", "Hero2", "Pawn"];
        const playerBSetup = ["Hero2", "Pawn", "Hero1", "Pawn", "Pawn"];
        initializeGame(playerASetup, playerBSetup);
      })
      .catch((error) => {
        console.error("Failed to connect to WebSocket:", error);
      });

    return
  }, []);
  // Function to handle game state updates
  const handleGameStateUpdate = (newState) => {
    setBoard(newState.board);
    setCurrentTurn(newState.currentTurn);
  };

  // Function to handle invalid moves
  const handleInvalidMove = (message) => {
    alert(`Invalid move: ${message}`);
  };

  // Function to handle game over
  const handleGameOver = (winner) => {
    alert(`Game over! Winner: ${winner}`);
    resetGame();
  };

  // Function to reset the game
  const resetGame = () => {
    initializeGame();
    setCurrentTurn("A");
  };

  // Function to handle player moves
  const handleMove = (row, col) => {
    const moveDirection = calculateMoveDirection(row, col);
    if (moveDirection) {
      const move = {
        character: selectedCharacter,
        move: moveDirection,
      };
      sendMove(move);
    } else {
      console.error("Invalid move direction.");
    }
  };

  const calculateMoveDirection = (row, col) => {
    if (!selectedCharacter || !selectedCharacterPosition) return null;

    const { row: currentRow, col: currentCol } = selectedCharacterPosition;

    const rowDiff = row - currentRow;
    const colDiff = col - currentCol;

    if (
      selectedCharacter.type === "Pawn" ||
      selectedCharacter.type === "Hero1"
    ) {
      if (rowDiff === 0 && colDiff === -1) return "L"; // Move Left
      if (rowDiff === 0 && colDiff === 1) return "R"; // Move Right
      if (rowDiff === -1 && colDiff === 0) return "F"; // Move Forward
      if (rowDiff === 1 && colDiff === 0) return "B"; // Move Backward
    }

    // For Hero2 (moving diagonally)
    if (selectedCharacter.type === "Hero2") {
      if (rowDiff === -1 && colDiff === -1) return "FL"; // Move Forward-Left
      if (rowDiff === -1 && colDiff === 1) return "FR"; // Move Forward-Right
      if (rowDiff === 1 && colDiff === -1) return "BL"; // Move Backward-Left
      if (rowDiff === 1 && colDiff === 1) return "BR"; // Move Backward-Right
    }
    return null;
  };

  // Function to select a character
  const selectCharacter = (row, col) => {
    const character = board[row][col];
    if (character && character.owner === currentTurn) {
      setSelectedCharacter(character);
      setSelectedCharacterPosition({ row, col });
    }
  };
useEffect(() => {
  console.log("Current Board State:", board);
}, [board]);
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Turn: Player {currentTurn}</h1>
      <div className="grid grid-cols-5 gap-2">
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="w-16 h-16 border border-gray-400 flex items-center justify-center"
              onClick={() =>
                selectedCharacter
                  ? handleMove(rowIndex, colIndex)
                  : selectCharacter(rowIndex, colIndex)
              }
            >
              {cell ? cell.name : ""}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GameBoard;
