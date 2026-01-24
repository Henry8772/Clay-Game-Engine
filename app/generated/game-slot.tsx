"use client";
import React, { useState, useCallback, useEffect } from 'react';

interface PieceDetails {
  id: string;
  type: string;
  color: 'white' | 'black';
  position: string;
  hasMoved: boolean;
  captured: boolean;
}

interface SquareData {
  id: string;
  position: string;
  color: 'dark' | 'light';
  pieceId: string | null;
}

interface GameState {
  board: SquareData[];
  pieces: { [id: string]: PieceDetails };
  selectedPieceId: string | null;
  turn: 'white' | 'black';
  gameOver: boolean;
  winner: 'white' | 'black' | 'draw' | null;
  check: 'white' | 'black' | null;
  checkmate: boolean;
  highlightedSquares: string[];
}

interface AssetMap {
  [key: string]: string; // e.g., "white_rook_a": "/path/to/white_rook_a.png"
}

interface GameProps {
  initialState: GameState;
  assetMap: AssetMap;
}

interface PieceProps {
  piece: PieceDetails;
  assetMap: AssetMap;
}

const Piece: React.FC<PieceProps> = ({ piece, assetMap }) => {
  if (!piece) return null;

  const assetKey = piece.id;
  const imgSrc = assetMap[assetKey];

  if (!imgSrc) {
    // Fallback if the exact piece ID asset is not provided in assetMap
    // Tries to find a generic asset (e.g., "white_king" instead of "white_king_e")
    const genericAssetKey = `${piece.color}_${piece.type}`;
    const genericImgSrc = assetMap[genericAssetKey];
    if (genericImgSrc) {
      return (
        <img
          src={genericImgSrc}
          alt={`${piece.color} ${piece.type}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none'
          }}
        />
      );
    }
    // If no image asset is found, display text abbreviation
    return (
      <span style={{ fontSize: '0.8em', textAlign: 'center', pointerEvents: 'none', color: piece.color === 'white' ? '#fff' : '#000' }}>
        {piece.color.slice(0, 1).toUpperCase()}
        {piece.type.slice(0, 2).toLowerCase()}
      </span>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={`${piece.color} ${piece.type}`}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        pointerEvents: 'none'
      }}
    />
  );
};

interface SquareProps {
  square: SquareData;
  piece: PieceDetails | null;
  isSelected: boolean;
  isHighlighted: boolean;
  isAttackable: boolean;
  isCheckWarning: boolean;
  onClick: (squareId: string) => void;
  assetMap: AssetMap;
}

const Square: React.FC<SquareProps> = ({
  square,
  piece,
  isSelected,
  isHighlighted,
  isAttackable,
  isCheckWarning,
  onClick,
  assetMap
}) => {
  const handleClick = useCallback(() => {
    onClick(square.id);
  }, [onClick, square.id]);

  const backgroundColor = square.color === 'light' ? '#f0d9b5' : '#b58863';

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: backgroundColor,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    cursor: 'pointer',
    boxSizing: 'border-box',
    transition: 'background-color 0.2s, box-shadow 0.2s'
  };

  if (isSelected) {
    containerStyle.boxShadow = 'inset 0 0 0 4px #ffcc00';
  } else if (isCheckWarning) {
    containerStyle.backgroundColor = 'rgba(255, 0, 0, 0.6)';
  } else if (isHighlighted && piece && isAttackable) {
    containerStyle.boxShadow = 'inset 0 0 0 4px #ff6666';
    containerStyle.backgroundColor = 'rgba(255, 102, 102, 0.3)';
  }

  return (
    <div
      onClick={handleClick}
      style={containerStyle}
    >
      {isHighlighted && !piece && (
        <div
          style={{
            width: '30%',
            height: '30%',
            backgroundColor: 'rgba(0, 200, 0, 0.3)',
            borderRadius: '50%',
            opacity: 0.7,
            position: 'absolute',
          }}
        />
      )}
      {piece && <Piece piece={piece} assetMap={assetMap} />}
    </div>
  );
};

const _Game: React.FC<GameProps> = ({ initialState, assetMap }) => {
  const [gameState, setGameState] = useState<GameState>(initialState); useEffect(() => { setGameState(initialState); }, [initialState]);

  const getPieceById = useCallback(
    (pieceId: string | null) => {
      return pieceId ? gameState.pieces[pieceId] : null;
    },
    [gameState.pieces]
  );

  const simulateValidMoves = useCallback(
    (selectedPiece: PieceDetails): string[] => {
      const moves: string[] = [];
      const currentPos = selectedPiece.position;
      const colChar = currentPos.charCodeAt(0);
      const rowNum = parseInt(currentPos[1]);

      const deltas = [
        [0, 1], [0, -1], [1, 0], [-1, 0],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
      ];

      // Simulate moves for sliding pieces (Rook, Bishop, Queen)
      const isSlidingPiece = selectedPiece.type === 'rook' || selectedPiece.type === 'bishop' || selectedPiece.type === 'queen';

      if (selectedPiece.type === 'king' || selectedPiece.type === 'queen' || selectedPiece.type === 'rook' || selectedPiece.type === 'bishop') {
        for (const [dCol, dRow] of deltas) {
          let targetCol = colChar;
          let targetRow = rowNum;
          for (let i = 0; i < (isSlidingPiece ? 8 : 1); i++) {
            targetCol += dCol;
            targetRow += dRow;
            const newCol = String.fromCharCode(targetCol);
            const newRow = targetRow;

            if (newCol >= 'a' && newCol <= 'h' && newRow >= 1 && newRow <= 8) {
              const targetPos = `${newCol}${newRow}`;
              const targetSquare = gameState.board.find(s => s.position === targetPos);

              if (targetSquare) {
                if (targetSquare.pieceId) {
                  const targetPiece = getPieceById(targetSquare.pieceId);
                  if (targetPiece && targetPiece.color !== selectedPiece.color) {
                    moves.push(targetSquare.id);
                  }
                  break; // Stop sliding after hitting any piece
                } else {
                  moves.push(targetSquare.id);
                }
              }
            } else {
              break; // Out of bounds
            }
          }
        }
      }

      // Pawn specific moves (simplified)
      if (selectedPiece.type === 'pawn') {
        const direction = selectedPiece.color === 'white' ? 1 : -1;
        const startRow = selectedPiece.color === 'white' ? 2 : 7;

        // One step forward
        const oneStepPos = `${currentPos[0]}${rowNum + direction}`;
        const oneStepSquare = gameState.board.find(s => s.position === oneStepPos);
        if (oneStepSquare && !oneStepSquare.pieceId) {
          moves.push(oneStepSquare.id);
          // Two steps forward from start
          if (rowNum === startRow) {
            const twoStepPos = `${currentPos[0]}${rowNum + 2 * direction}`;
            const twoStepSquare = gameState.board.find(s => s.position === twoStepPos);
            if (twoStepSquare && !twoStepSquare.pieceId) {
              moves.push(twoStepSquare.id);
            }
          }
        }
        // Basic diagonal attacks
        const attackLeftCol = String.fromCharCode(colChar - 1);
        const attackRightCol = String.fromCharCode(colChar + 1);
        const attackRow = rowNum + direction;

        [attackLeftCol, attackRightCol].forEach(col => {
          if (col >= 'a' && col <= 'h' && attackRow >= 1 && attackRow <= 8) {
            const attackPos = `${col}${attackRow}`;
            const attackSquare = gameState.board.find(s => s.position === attackPos);
            if (attackSquare && attackSquare.pieceId) {
              const attackedPiece = getPieceById(attackSquare.pieceId);
              if (attackedPiece && attackedPiece.color !== selectedPiece.color) {
                moves.push(attackSquare.id);
              }
            }
          }
        });
      }

      // Knight specific moves
      if (selectedPiece.type === 'knight') {
        const knightDeltas = [
          [1, 2], [1, -2], [-1, 2], [-1, -2],
          [2, 1], [2, -1], [-2, 1], [-2, -1]
        ];
        knightDeltas.forEach(([dCol, dRow]) => {
          const targetCol = String.fromCharCode(colChar + dCol);
          const targetRow = rowNum + dRow;
          if (targetCol >= 'a' && targetCol <= 'h' && targetRow >= 1 && targetRow <= 8) {
            const targetPos = `${targetCol}${targetRow}`;
            const targetSquare = gameState.board.find(s => s.position === targetPos);
            if (targetSquare) {
              if (targetSquare.pieceId) {
                const targetPiece = getPieceById(targetSquare.pieceId);
                if (targetPiece && targetPiece.color !== selectedPiece.color) {
                  moves.push(targetSquare.id);
                }
              } else {
                moves.push(targetSquare.id);
              }
            }
          }
        });
      }

      return Array.from(new Set(moves.filter(id => id !== selectedPiece.position)));
    },
    [gameState.board, gameState.pieces, getPieceById]
  );

  useEffect(() => {
    if (gameState.selectedPieceId) {
      const selectedPiece = getPieceById(gameState.selectedPieceId);
      if (selectedPiece && selectedPiece.color === gameState.turn) {
        const moves = simulateValidMoves(selectedPiece);
        setGameState(prev => ({ ...prev, highlightedSquares: moves }));
      } else {
        setGameState(prev => ({ ...prev, selectedPieceId: null, highlightedSquares: [] }));
      }
    } else {
      setGameState(prev => ({ ...prev, highlightedSquares: [] }));
    }
  }, [gameState.selectedPieceId, gameState.turn, getPieceById, simulateValidMoves]);

  const handleSquareClick = useCallback(
    (squareId: string) => {
      setGameState(prev => {
        const clickedSquare = prev.board.find(s => s.id === squareId);
        if (!clickedSquare) return prev;

        const currentSelectedPieceId = prev.selectedPieceId;
        const pieceOnClickedSquare = clickedSquare.pieceId ? prev.pieces[clickedSquare.pieceId] : null;

        // Case 1: No piece is currently selected
        if (!currentSelectedPieceId) {
          if (pieceOnClickedSquare && pieceOnClickedSquare.color === prev.turn) {
            return { ...prev, selectedPieceId: pieceOnClickedSquare.id };
          }
          return prev;
        }

        // Case 2: A piece is already selected
        const selectedPiece = prev.pieces[currentSelectedPieceId];

        // If clicked square is the currently selected piece, deselect it
        if (clickedSquare.id === selectedPiece.position) {
          return { ...prev, selectedPieceId: null, highlightedSquares: [] };
        }

        // If clicked square has a piece of the current turn's color, select that instead
        if (pieceOnClickedSquare && pieceOnClickedSquare.color === prev.turn) {
          return { ...prev, selectedPieceId: pieceOnClickedSquare.id };
        }

        // Case 3: Try to move the selected piece to the clicked square
        if (prev.highlightedSquares.includes(squareId)) {
          const newBoard = prev.board.map(s => {
            if (s.id === selectedPiece.position) {
              return { ...s, pieceId: null };
            }
            if (s.id === squareId) {
              return { ...s, pieceId: currentSelectedPieceId };
            }
            return s;
          });

          const newPieces = { ...prev.pieces };

          // If there was an opponent's piece on the target square, capture it
          if (clickedSquare.pieceId && newPieces[clickedSquare.pieceId]) {
            newPieces[clickedSquare.pieceId] = { ...newPieces[clickedSquare.pieceId], captured: true, position: 'captured' };
          }

          newPieces[currentSelectedPieceId] = {
            ...newPieces[currentSelectedPieceId],
            position: clickedSquare.position,
            hasMoved: true,
          };

          const newTurn = prev.turn === 'white' ? 'black' : 'white';

          let newCheck: 'white' | 'black' | null = null;
          let newCheckmate = false;
          let newGameOver = false;
          let newWinner: 'white' | 'black' | 'draw' | null = null;

          if (Math.random() < 0.15) { // Simulate a chance to be in check
            newCheck = newTurn;
            if (Math.random() < 0.3) { // Simulate a chance for checkmate
              newCheckmate = true;
              newGameOver = true;
              newWinner = prev.turn;
            }
          }

          return {
            ...prev,
            board: newBoard,
            pieces: newPieces,
            selectedPieceId: null,
            highlightedSquares: [],
            turn: newTurn,
            check: newCheck,
            checkmate: newCheckmate,
            gameOver: newGameOver,
            winner: newWinner,
          };
        }

        // If clicked square is not a valid move for the selected piece, deselect
        return { ...prev, selectedPieceId: null, highlightedSquares: [] };
      });
    },
    [gameState.pieces, gameState.turn, gameState.highlightedSquares]
  );

  const kingInCheckId = gameState.check ? (
    Object.values(gameState.pieces).find(p => p.type === 'king' && p.color === gameState.check && !p.captured)?.id
  ) : null;

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#333',
        color: '#eee',
        padding: '20px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      <h1 style={{ marginBottom: '20px', color: '#fff' }}>Chess Game</h1>

      <div style={{ marginBottom: '15px', fontSize: '1.2em' }}>
        Current Turn: <span style={{ fontWeight: 'bold', color: gameState.turn === 'white' ? '#222' : '#eee', backgroundColor: gameState.turn === 'white' ? '#ddd' : '#555', padding: '5px 10px', borderRadius: '5px' }}>{gameState.turn.toUpperCase()}</span>
      </div>

      {gameState.check && (
        <div style={{ color: 'red', fontWeight: 'bold', marginBottom: '10px', fontSize: '1.3em' }}>
          CHECK! {gameState.checkmate && 'CHECKMATE!'}
        </div>
      )}
      {gameState.gameOver && gameState.winner && (
        <div style={{ color: '#ffd700', fontWeight: 'bold', marginBottom: '10px', fontSize: '1.5em' }}>
          Game Over! {gameState.winner.toUpperCase()} wins!
        </div>
      )}

      <div
        style={{
          width: 'min(90vw, 80vh)',
          height: 'min(90vw, 80vh)',
          maxWidth: '600px',
          maxHeight: '600px',
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gridTemplateRows: 'repeat(8, 1fr)',
          border: '2px solid #555',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          backgroundImage: assetMap.board ? `url(${assetMap.board})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          userSelect: 'none',
        }}
      >
        {gameState.board.map(square => {
          const piece = getPieceById(square.pieceId);
          const isSelected = gameState.selectedPieceId === square.pieceId;
          const isHighlighted = gameState.highlightedSquares.includes(square.id);
          const isAttackable = isHighlighted && piece && piece.color !== getPieceById(gameState.selectedPieceId)?.color;
          const isCheckWarning = kingInCheckId === square.pieceId;

          return (
            <Square
              key={square.id}
              square={square}
              piece={piece}
              isSelected={isSelected}
              isHighlighted={isHighlighted}
              isAttackable={isAttackable}
              isCheckWarning={isCheckWarning}
              onClick={handleSquareClick}
              assetMap={assetMap}
            />
          );
        })}
      </div>
    </div>
  );
};

    export const INITIAL_STATE = {"board":[{"id":"a1","position":"a1","color":"dark","pieceId":"white_rook_a"},{"id":"b1","position":"b1","color":"light","pieceId":"white_knight_b"},{"id":"c1","position":"c1","color":"dark","pieceId":"white_bishop_c"},{"id":"d1","position":"d1","color":"light","pieceId":"white_queen"},{"id":"e1","position":"e1","color":"dark","pieceId":"white_king"},{"id":"f1","position":"f1","color":"light","pieceId":"white_bishop_f"},{"id":"g1","position":"g1","color":"dark","pieceId":"white_knight_g"},{"id":"h1","position":"h1","color":"light","pieceId":"white_rook_h"},{"id":"a2","position":"a2","color":"light","pieceId":"white_pawn_a"},{"id":"b2","position":"b2","color":"dark","pieceId":"white_pawn_b"},{"id":"c2","position":"c2","color":"light","pieceId":"white_pawn_c"},{"id":"d2","position":"d2","color":"dark","pieceId":"white_pawn_d"},{"id":"e2","position":"e2","color":"light","pieceId":"white_pawn_e"},{"id":"f2","position":"f2","color":"dark","pieceId":"white_pawn_f"},{"id":"g2","position":"g2","color":"light","pieceId":"white_pawn_g"},{"id":"h2","position":"h2","color":"dark","pieceId":"white_pawn_h"},{"id":"a3","position":"a3","color":"dark","pieceId":null},{"id":"b3","position":"b3","color":"light","pieceId":null},{"id":"c3","position":"c3","color":"dark","pieceId":null},{"id":"d3","position":"d3","color":"light","pieceId":null},{"id":"e3","position":"e3","color":"dark","pieceId":null},{"id":"f3","position":"f3","color":"light","pieceId":null},{"id":"g3","position":"g3","color":"dark","pieceId":null},{"id":"h3","position":"h3","color":"light","pieceId":null},{"id":"a4","position":"a4","color":"light","pieceId":null},{"id":"b4","position":"b4","color":"dark","pieceId":null},{"id":"c4","position":"c4","color":"light","pieceId":null},{"id":"d4","position":"d4","color":"dark","pieceId":null},{"id":"e4","position":"e4","color":"light","pieceId":null},{"id":"f4","position":"f4","color":"dark","pieceId":null},{"id":"g4","position":"g4","color":"light","pieceId":null},{"id":"h4","position":"h4","color":"dark","pieceId":null},{"id":"a5","position":"a5","color":"dark","pieceId":null},{"id":"b5","position":"b5","color":"light","pieceId":null},{"id":"c5","position":"c5","color":"dark","pieceId":null},{"id":"d5","position":"d5","color":"light","pieceId":null},{"id":"e5","position":"e5","color":"dark","pieceId":null},{"id":"f5","position":"f5","color":"light","pieceId":null},{"id":"g5","position":"g5","color":"dark","pieceId":null},{"id":"h5","position":"h5","color":"light","pieceId":null},{"id":"a6","position":"a6","color":"light","pieceId":null},{"id":"b6","position":"b6","color":"dark","pieceId":null},{"id":"c6","position":"c6","color":"light","pieceId":null},{"id":"d6","position":"d6","color":"dark","pieceId":null},{"id":"e6","position":"e6","color":"light","pieceId":null},{"id":"f6","position":"f6","color":"dark","pieceId":null},{"id":"g6","position":"g6","color":"light","pieceId":null},{"id":"h6","position":"h6","color":"dark","pieceId":null},{"id":"a7","position":"a7","color":"dark","pieceId":"black_pawn_a"},{"id":"b7","position":"b7","color":"light","pieceId":"black_pawn_b"},{"id":"c7","position":"c7","color":"dark","pieceId":"black_pawn_c"},{"id":"d7","position":"d7","color":"light","pieceId":"black_pawn_d"},{"id":"e7","position":"e7","color":"dark","pieceId":"black_pawn_e"},{"id":"f7","position":"f7","color":"light","pieceId":"black_pawn_f"},{"id":"g7","position":"g7","color":"dark","pieceId":"black_pawn_g"},{"id":"h7","position":"h7","color":"light","pieceId":"black_pawn_h"},{"id":"a8","position":"a8","color":"light","pieceId":"black_rook_a"},{"id":"b8","position":"b8","color":"dark","pieceId":"black_knight_b"},{"id":"c8","position":"c8","color":"light","pieceId":"black_bishop_c"},{"id":"d8","position":"d8","color":"dark","pieceId":"black_queen"},{"id":"e8","position":"e8","color":"light","pieceId":"black_king"},{"id":"f8","position":"f8","color":"dark","pieceId":"black_bishop_f"},{"id":"g8","position":"g8","color":"light","pieceId":"black_knight_g"},{"id":"h8","position":"h8","color":"dark","pieceId":"black_rook_h"}],"pieces":{"white_rook_a":{"id":"white_rook_a","type":"rook","color":"white","position":"a1","hasMoved":false,"captured":false},"white_rook_h":{"id":"white_rook_h","type":"rook","color":"white","position":"h1","hasMoved":false,"captured":false},"white_knight_b":{"id":"white_knight_b","type":"knight","color":"white","position":"b1","hasMoved":false,"captured":false},"white_knight_g":{"id":"white_knight_g","type":"knight","color":"white","position":"g1","hasMoved":false,"captured":false},"white_bishop_c":{"id":"white_bishop_c","type":"bishop","color":"white","position":"c1","hasMoved":false,"captured":false},"white_bishop_f":{"id":"white_bishop_f","type":"bishop","color":"white","position":"f1","hasMoved":false,"captured":false},"white_queen":{"id":"white_queen","type":"queen","color":"white","position":"d1","hasMoved":false,"captured":false},"white_king":{"id":"white_king","type":"king","color":"white","position":"e1","hasMoved":false,"captured":false},"white_pawn_a":{"id":"white_pawn_a","type":"pawn","color":"white","position":"a2","hasMoved":false,"captured":false},"white_pawn_b":{"id":"white_pawn_b","type":"pawn","color":"white","position":"b2","hasMoved":false,"captured":false},"white_pawn_c":{"id":"white_pawn_c","type":"pawn","color":"white","position":"c2","hasMoved":false,"captured":false},"white_pawn_d":{"id":"white_pawn_d","type":"pawn","color":"white","position":"d2","hasMoved":false,"captured":false},"white_pawn_e":{"id":"white_pawn_e","type":"pawn","color":"white","position":"e2","hasMoved":false,"captured":false},"white_pawn_f":{"id":"white_pawn_f","type":"pawn","color":"white","position":"f2","hasMoved":false,"captured":false},"white_pawn_g":{"id":"white_pawn_g","type":"pawn","color":"white","position":"g2","hasMoved":false,"captured":false},"white_pawn_h":{"id":"white_pawn_h","type":"pawn","color":"white","position":"h2","hasMoved":false,"captured":false},"black_rook_a":{"id":"black_rook_a","type":"rook","color":"black","position":"a8","hasMoved":false,"captured":false},"black_rook_h":{"id":"black_rook_h","type":"rook","color":"black","position":"h8","hasMoved":false,"captured":false},"black_knight_b":{"id":"black_knight_b","type":"knight","color":"black","position":"b8","hasMoved":false,"captured":false},"black_knight_g":{"id":"black_knight_g","type":"knight","color":"black","position":"g8","hasMoved":false,"captured":false},"black_bishop_c":{"id":"black_bishop_c","type":"bishop","color":"black","position":"c8","hasMoved":false,"captured":false},"black_bishop_f":{"id":"black_bishop_f","type":"bishop","color":"black","position":"f8","hasMoved":false,"captured":false},"black_queen":{"id":"black_queen","type":"queen","color":"black","position":"d8","hasMoved":false,"captured":false},"black_king":{"id":"black_king","type":"king","color":"black","position":"e8","hasMoved":false,"captured":false},"black_pawn_a":{"id":"black_pawn_a","type":"pawn","color":"black","position":"a7","hasMoved":false,"captured":false},"black_pawn_b":{"id":"black_pawn_b","type":"pawn","color":"black","position":"b7","hasMoved":false,"captured":false},"black_pawn_c":{"id":"black_pawn_c","type":"pawn","color":"black","position":"c7","hasMoved":false,"captured":false},"black_pawn_d":{"id":"black_pawn_d","type":"pawn","color":"black","position":"d7","hasMoved":false,"captured":false},"black_pawn_e":{"id":"black_pawn_e","type":"pawn","color":"black","position":"e7","hasMoved":false,"captured":false},"black_pawn_f":{"id":"black_pawn_f","type":"pawn","color":"black","position":"f7","hasMoved":false,"captured":false},"black_pawn_g":{"id":"black_pawn_g","type":"pawn","color":"black","position":"g7","hasMoved":false,"captured":false},"black_pawn_h":{"id":"black_pawn_h","type":"pawn","color":"black","position":"h7","hasMoved":false,"captured":false}},"selectedPieceId":null,"turn":"white","gameOver":false,"winner":null,"check":null,"checkmate":false,"highlightedSquares":[]};
    export const ASSET_MAP = {"board":"/generated-assets/board.png","white_rook_a":"/generated-assets/white_rook_a.png","white_rook_h":"/generated-assets/white_rook_h.png"};
    export const GAME_RULES = "Standard chess rules.";
    

    export const Game = (props: { initialState?: any, assetMap?: any }) => {
        const state = props.initialState || INITIAL_STATE;
        const assets = props.assetMap || ASSET_MAP;
        return <_Game initialState={state} assetMap={assets} />;
    };
    