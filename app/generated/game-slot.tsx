import React, { useState, useEffect } from 'react';

// --- ASSET MAP ---
export const ASSET_MAP = {
  "white_queen": "/generated-assets/white_queen.png",
  "black_queen": "/generated-assets/black_queen.png",
  "white_pawn": "/generated-assets/white_pawn.png",
  "black_knight": "/generated-assets/black_knight.png",
  "white_bishop": "/generated-assets/white_bishop.png",
  "boardSquare_dark": "/generated-assets/boardSquare_dark.png",
  "white_king": "/generated-assets/white_king.png",
  "white_rook": "/generated-assets/white_rook.png",
  "black_pawn": "/generated-assets/black_pawn.png",
  "captureIndicator": "/generated-assets/captureIndicator.png",
  "black_rook": "/generated-assets/black_rook.png",
  "black_king": "/generated-assets/black_king.png",
  "white_knight": "/generated-assets/white_knight.png",
  "currentPlayerIndicator": "/generated-assets/currentPlayerIndicator.png",
  "boardCoordinate_letter": "/generated-assets/boardCoordinate_letter.png",
  "boardSquare_light": "/generated-assets/boardSquare_light.png",
  "boardCoordinate_number": "/generated-assets/boardCoordinate_number.png",
  "selectionIndicator": "/generated-assets/selectionIndicator.png",
  "black_bishop": "/generated-assets/black_bishop.png",
  "validMoveIndicator": "/generated-assets/validMoveIndicator.png"
};

// --- INITIAL STATE ---
export const INITIAL_STATE = {
  "currentPlayer": "white",
  "selectedPieceId": null,
  "validMoves": [],
  "gameOver": false,
  "winner": null,
  "squares": [
    {
      "id": "s_0_0",
      "x": 0,
      "y": 0,
      "color": "dark",
      "pieceId": "wr_a1"
    },
    {
      "id": "s_1_0",
      "x": 1,
      "y": 0,
      "color": "light",
      "pieceId": "wn_b1"
    },
    {
      "id": "s_2_0",
      "x": 2,
      "y": 0,
      "color": "dark",
      "pieceId": "wb_c1"
    },
    {
      "id": "s_3_0",
      "x": 3,
      "y": 0,
      "color": "light",
      "pieceId": "wq_d1"
    },
    {
      "id": "s_4_0",
      "x": 4,
      "y": 0,
      "color": "dark",
      "pieceId": "wk_e1"
    },
    {
      "id": "s_5_0",
      "x": 5,
      "y": 0,
      "color": "light",
      "pieceId": "wb_f1"
    },
    {
      "id": "s_6_0",
      "x": 6,
      "y": 0,
      "color": "dark",
      "pieceId": "wn_g1"
    },
    {
      "id": "s_7_0",
      "x": 7,
      "y": 0,
      "color": "light",
      "pieceId": "wr_h1"
    },
    {
      "id": "s_0_1",
      "x": 0,
      "y": 1,
      "color": "light",
      "pieceId": "wp_a2"
    },
    {
      "id": "s_1_1",
      "x": 1,
      "y": 1,
      "color": "dark",
      "pieceId": "wp_b2"
    },
    {
      "id": "s_2_1",
      "x": 2,
      "y": 1,
      "color": "light",
      "pieceId": "wp_c2"
    },
    {
      "id": "s_3_1",
      "x": 3,
      "y": 1,
      "color": "dark",
      "pieceId": "wp_d2"
    },
    {
      "id": "s_4_1",
      "x": 4,
      "y": 1,
      "color": "light",
      "pieceId": "wp_e2"
    },
    {
      "id": "s_5_1",
      "x": 5,
      "y": 1,
      "color": "dark",
      "pieceId": "wp_f2"
    },
    {
      "id": "s_6_1",
      "x": 6,
      "y": 1,
      "color": "light",
      "pieceId": "wp_g2"
    },
    {
      "id": "s_7_1",
      "x": 7,
      "y": 1,
      "color": "dark",
      "pieceId": "wp_h2"
    },
    {
      "id": "s_0_2",
      "x": 0,
      "y": 2,
      "color": "dark",
      "pieceId": null
    },
    {
      "id": "s_1_2",
      "x": 1,
      "y": 2,
      "color": "light",
      "pieceId": null
    },
    {
      "id": "s_2_2",
      "x": 2,
      "y": 2,
      "color": "dark",
      "pieceId": null
    },
    {
      "id": "s_3_2",
      "x": 3,
      "y": 2,
      "color": "light",
      "pieceId": null
    },
    {
      "id": "s_4_2",
      "x": 4,
      "y": 2,
      "color": "dark",
      "pieceId": null
    },
    {
      "id": "s_5_2",
      "x": 5,
      "y": 2,
      "color": "light",
      "pieceId": null
    },
    {
      "id": "s_6_2",
      "x": 6,
      "y": 2,
      "color": "dark",
      "pieceId": null
    },
    {
      "id": "s_7_2",
      "x": 7,
      "y": 2,
      "color": "light",
      "pieceId": null
    },
    {
      "id": "s_0_3",
      "x": 0,
      "y": 3,
      "color": "light",
      "pieceId": null
    },
    {
      "id": "s_1_3",
      "x": 1,
      "y": 3,
      "color": "dark",
      "pieceId": null
    },
    {
      "id": "s_2_3",
      "x": 2,
      "y": 3,
      "color": "light",
      "pieceId": null
    },
    {
      "id": "s_3_3",
      "x": 3,
      "y": 3,
      "color": "dark",
      "pieceId": null
    },
    {
      "id": "s_4_3",
      "x": 4,
      "y": 3,
      "color": "light",
      "pieceId": null
    },
    {
      "id": "s_5_3",
      "x": 5,
      "y": 3,
      "color": "dark",
      "pieceId": null
    },
    {
      "id": "s_6_3",
      "x": 6,
      "y": 3,
      "color": "light",
      "pieceId": null
    },
    {
      "id": "s_7_3",
      "x": 7,
      "y": 3,
      "color": "dark",
      "pieceId": null
    },
    {
      "id": "s_0_4",
      "x": 0,
      "y": 4,
      "color": "dark",
      "pieceId": null
    },
    {
      "id": "s_1_4",
      "x": 1,
      "y": 4,
      "color": "light",
      "pieceId": null
    },
    {
      "id": "s_2_4",
      "x": 2,
      "y": 4,
      "color": "dark",
      "pieceId": null
    },
    {
      "id": "s_3_4",
      "x": 3,
      "y": 4,
      "color": "light",
      "pieceId": null
    },
    {
      "id": "s_4_4",
      "x": 4,
      "y": 4,
      "color": "dark",
      "pieceId": null
    },
    {
      "id": "s_5_4",
      "x": 5,
      "y": 4,
      "color": "light",
      "pieceId": null
    },
    {
      "id": "s_6_4",
      "x": 6,
      "y": 4,
      "color": "dark",
      "pieceId": null
    },
    {
      "id": "s_7_4",
      "x": 7,
      "y": 4,
      "color": "light",
      "pieceId": null
    },
    {
      "id": "s_0_5",
      "x": 0,
      "y": 5,
      "color": "light",
      "pieceId": null
    },
    {
      "id": "s_1_5",
      "x": 1,
      "y": 5,
      "color": "dark",
      "pieceId": null
    },
    {
      "id": "s_2_5",
      "x": 2,
      "y": 5,
      "color": "light",
      "pieceId": null
    },
    {
      "id": "s_3_5",
      "x": 3,
      "y": 5,
      "color": "dark",
      "pieceId": null
    },
    {
      "id": "s_4_5",
      "x": 4,
      "y": 5,
      "color": "light",
      "pieceId": null
    },
    {
      "id": "s_5_5",
      "x": 5,
      "y": 5,
      "color": "dark",
      "pieceId": null
    },
    {
      "id": "s_6_5",
      "x": 6,
      "y": 5,
      "color": "light",
      "pieceId": null
    },
    {
      "id": "s_7_5",
      "x": 7,
      "y": 5,
      "color": "dark",
      "pieceId": null
    },
    {
      "id": "s_0_6",
      "x": 0,
      "y": 6,
      "color": "dark",
      "pieceId": "bp_a7"
    },
    {
      "id": "s_1_6",
      "x": 1,
      "y": 6,
      "color": "light",
      "pieceId": "bp_b7"
    },
    {
      "id": "s_2_6",
      "x": 2,
      "y": 6,
      "color": "dark",
      "pieceId": "bp_c7"
    },
    {
      "id": "s_3_6",
      "x": 3,
      "y": 6,
      "color": "light",
      "pieceId": "bp_d7"
    },
    {
      "id": "s_4_6",
      "x": 4,
      "y": 6,
      "color": "dark",
      "pieceId": "bp_e7"
    },
    {
      "id": "s_5_6",
      "x": 5,
      "y": 6,
      "color": "light",
      "pieceId": "bp_f7"
    },
    {
      "id": "s_6_6",
      "x": 6,
      "y": 6,
      "color": "dark",
      "pieceId": "bp_g7"
    },
    {
      "id": "s_7_6",
      "x": 7,
      "y": 6,
      "color": "light",
      "pieceId": "bp_h7"
    },
    {
      "id": "s_0_7",
      "x": 0,
      "y": 7,
      "color": "light",
      "pieceId": "br_a8"
    },
    {
      "id": "s_1_7",
      "x": 1,
      "y": 7,
      "color": "dark",
      "pieceId": "bn_b8"
    },
    {
      "id": "s_2_7",
      "x": 2,
      "y": 7,
      "color": "light",
      "pieceId": "bb_c8"
    },
    {
      "id": "s_3_7",
      "x": 3,
      "y": 7,
      "color": "dark",
      "pieceId": "bq_d8"
    },
    {
      "id": "s_4_7",
      "x": 4,
      "y": 7,
      "color": "light",
      "pieceId": "bk_e8"
    },
    {
      "id": "s_5_7",
      "x": 5,
      "y": 7,
      "color": "dark",
      "pieceId": "bb_f8"
    },
    {
      "id": "s_6_7",
      "x": 6,
      "y": 7,
      "color": "light",
      "pieceId": "bn_g8"
    },
    {
      "id": "s_7_7",
      "x": 7,
      "y": 7,
      "color": "dark",
      "pieceId": "br_h8"
    }
  ],
  "pieces": [
    {
      "id": "wr_a1",
      "type": "rook",
      "color": "white",
      "position": "s_0_0",
      "hasMoved": false
    },
    {
      "id": "wn_b1",
      "type": "knight",
      "color": "white",
      "position": "s_1_0",
      "hasMoved": false
    },
    {
      "id": "wb_c1",
      "type": "bishop",
      "color": "white",
      "position": "s_2_0",
      "hasMoved": false
    },
    {
      "id": "wq_d1",
      "type": "queen",
      "color": "white",
      "position": "s_3_0",
      "hasMoved": false
    },
    {
      "id": "wk_e1",
      "type": "king",
      "color": "white",
      "position": "s_4_0",
      "hasMoved": false
    },
    {
      "id": "wb_f1",
      "type": "bishop",
      "color": "white",
      "position": "s_5_0",
      "hasMoved": false
    },
    {
      "id": "wn_g1",
      "type": "knight",
      "color": "white",
      "position": "s_6_0",
      "hasMoved": false
    },
    {
      "id": "wr_h1",
      "type": "rook",
      "color": "white",
      "position": "s_7_0",
      "hasMoved": false
    },
    {
      "id": "wp_a2",
      "type": "pawn",
      "color": "white",
      "position": "s_0_1",
      "hasMoved": false
    },
    {
      "id": "wp_b2",
      "type": "pawn",
      "color": "white",
      "position": "s_1_1",
      "hasMoved": false
    },
    {
      "id": "wp_c2",
      "type": "pawn",
      "color": "white",
      "position": "s_2_1",
      "hasMoved": false
    },
    {
      "id": "wp_d2",
      "type": "pawn",
      "color": "white",
      "position": "s_3_1",
      "hasMoved": false
    },
    {
      "id": "wp_e2",
      "type": "pawn",
      "color": "white",
      "position": "s_4_1",
      "hasMoved": false
    },
    {
      "id": "wp_f2",
      "type": "pawn",
      "color": "white",
      "position": "s_5_1",
      "hasMoved": false
    },
    {
      "id": "wp_g2",
      "type": "pawn",
      "color": "white",
      "position": "s_6_1",
      "hasMoved": false
    },
    {
      "id": "wp_h2",
      "type": "pawn",
      "color": "white",
      "position": "s_7_1",
      "hasMoved": false
    },
    {
      "id": "br_a8",
      "type": "rook",
      "color": "black",
      "position": "s_0_7",
      "hasMoved": false
    },
    {
      "id": "bn_b8",
      "type": "knight",
      "color": "black",
      "position": "s_1_7",
      "hasMoved": false
    },
    {
      "id": "bb_c8",
      "type": "bishop",
      "color": "black",
      "position": "s_2_7",
      "hasMoved": false
    },
    {
      "id": "bq_d8",
      "type": "queen",
      "color": "black",
      "position": "s_3_7",
      "hasMoved": false
    },
    {
      "id": "bk_e8",
      "type": "king",
      "color": "black",
      "position": "s_4_7",
      "hasMoved": false
    },
    {
      "id": "bb_f8",
      "type": "bishop",
      "color": "black",
      "position": "s_5_7",
      "hasMoved": false
    },
    {
      "id": "bn_g8",
      "type": "knight",
      "color": "black",
      "position": "s_6_7",
      "hasMoved": false
    },
    {
      "id": "br_h8",
      "type": "rook",
      "color": "black",
      "position": "s_7_7",
      "hasMoved": false
    },
    {
      "id": "bp_a7",
      "type": "pawn",
      "color": "black",
      "position": "s_0_6",
      "hasMoved": false
    },
    {
      "id": "bp_b7",
      "type": "pawn",
      "color": "black",
      "position": "s_1_6",
      "hasMoved": false
    },
    {
      "id": "bp_c7",
      "type": "pawn",
      "color": "black",
      "position": "s_2_6",
      "hasMoved": false
    },
    {
      "id": "bp_d7",
      "type": "pawn",
      "color": "black",
      "position": "s_3_6",
      "hasMoved": false
    },
    {
      "id": "bp_e7",
      "type": "pawn",
      "color": "black",
      "position": "s_4_6",
      "hasMoved": false
    },
    {
      "id": "bp_f7",
      "type": "pawn",
      "color": "black",
      "position": "s_5_6",
      "hasMoved": false
    },
    {
      "id": "bp_g7",
      "type": "pawn",
      "color": "black",
      "position": "s_6_6",
      "hasMoved": false
    },
    {
      "id": "bp_h7",
      "type": "pawn",
      "color": "black",
      "position": "s_7_6",
      "hasMoved": false
    }
  ]
};

// --- GAME RULES ---
export const GAME_RULES = "Chess is a two-player strategy board game played on a checkered board with 64 squares arranged in an 8x8 grid. Each player begins with 16 pieces: one king, one queen, two rooks, two knights, two bishops, and eight pawns. The object of the game is to checkmate the opponent's king, whereby the king is under immediate attack (in 'check') and there is no legal way to remove it from attack on the next move. Pieces move in specific ways: Pawns move forward, rooks move horizontally or vertically, knights move in an 'L' shape, bishops move diagonally, the queen moves any direction, and the king moves one square in any direction.";

// --- Game Component ---
export const Game = ({ initialState: propInitialState }) => {
  const [gameState, setGameState] = useState(propInitialState || INITIAL_STATE);

  // Helper to map piece type and color to asset key
  const getPieceAssetKey = (piece) => {
    if (!piece) return null;
    return `${piece.color}_${piece.type}`;
  };

  // Create a map for quick lookup of pieces by ID
  const pieceMap = new Map(gameState.pieces.map(p => [p.id, p]));

  // Create a map for quick lookup of valid moves by target square ID
  const validMoveMap = new Map();
  gameState.validMoves.forEach(move => {
    validMoveMap.set(move.targetSquareId, move);
  });

  const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

  // Basic styling for the game container
  const gameContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#333',
    color: 'white',
    padding: '20px',
    borderRadius: '10px',
  };

  const boardWrapperStyle = {
    display: 'grid',
    gridTemplateColumns: 'auto repeat(8, 60px) auto', // For A-H labels
    gridTemplateRows: 'auto repeat(8, 60px) auto', // For 1-8 labels
    border: '2px solid #8B4513', // Wood-like border
    boxShadow: '0 0 10px rgba(0,0,0,0.5)',
  };

  const squareStyle = {
    width: '60px',
    height: '60px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundSize: 'cover',
  };

  const pieceStyle = {
    width: '80%',
    height: '80%',
    objectFit: 'contain',
    zIndex: 2,
  };

  const indicatorStyle = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  };

  const dotIndicatorStyle = {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 255, 0, 0.6)', // Green dot
  };

  const captureIndicatorImageStyle = {
    width: '60%',
    height: '60%',
    objectFit: 'contain',
  };

  const coordinateLabelStyle = {
    width: '60px',
    height: '60px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#ccc',
  };

  const gameOverStyle = {
    marginTop: '20px',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#FFD700', // Gold color
  };

  return (
    <div style={gameContainerStyle}>
      <h1>Chess Game</h1>
      
      {gameState.gameOver ? (
        <div style={gameOverStyle}>
          GAME OVER! {gameState.winner ? `${gameState.winner.toUpperCase()} WINS!` : 'IT\'S A DRAW!'}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <img src={ASSET_MAP.currentPlayerIndicator} alt="Current Player" style={{ width: '30px', height: '30px' }} />
          <h2>Current Player: <span style={{ textTransform: 'capitalize' }}>{gameState.currentPlayer}</span></h2>
        </div>
      )}

      <div style={boardWrapperStyle}>
        {/* Top coordinate labels (A-H) */}
        <div style={{ ...coordinateLabelStyle, gridColumn: '1 / span 1', gridRow: '1 / span 1', visibility: 'hidden' }}></div> {/* Empty corner */}
        {files.map((file, index) => (
          <div key={`file-top-${index}`} style={{ ...coordinateLabelStyle, gridColumn: `${index + 2} / span 1`, gridRow: '1 / span 1' }}>
            {file}
          </div>
        ))}
        <div style={{ ...coordinateLabelStyle, gridColumn: '10 / span 1', gridRow: '1 / span 1', visibility: 'hidden' }}></div> {/* Empty corner */}

        {gameState.squares.map((square) => {
          const piece = square.pieceId ? pieceMap.get(square.pieceId) : null;
          const pieceAssetKey = piece ? getPieceAssetKey(piece) : null;
          const pieceAsset = pieceAssetKey ? ASSET_MAP[pieceAssetKey] : null;

          const isSelected = gameState.selectedPieceId === square.pieceId;
          const validMove = validMoveMap.get(square.id);
          const isTargetOfValidMove = !!validMove;
          const isCaptureMove = isTargetOfValidMove && validMove.isCapture;

          // Chess board ranks (rows) are typically 1-8, with 1 at the bottom. Our Y-coordinate is 0-indexed, 0 at bottom.
          // To display rank 8 at the top of the grid and rank 1 at the bottom, we map grid row as (9 - y).
          // Columns are A-H, x-coordinate 0-7. We map grid column as (x + 2) to account for left rank labels.
          const gridRow = 9 - square.y; 
          const gridColumn = square.x + 2;

          return (
            <React.Fragment key={square.id}>
              {/* Left Rank Labels (1-8) */}
              {square.x === 0 && (
                <div style={{ ...coordinateLabelStyle, gridColumn: '1 / span 1', gridRow: `${gridRow} / span 1` }}>
                  {ranks[square.y]}
                </div>
              )}
              
              <div
                style={{
                  ...squareStyle,
                  backgroundImage: `url(${ASSET_MAP[`boardSquare_${square.color}`]})`,
                  gridColumn: `${gridColumn} / span 1`,
                  gridRow: `${gridRow} / span 1`,
                }}
              >
                {pieceAsset && (
                  <img src={pieceAsset} alt={`${piece.color} ${piece.type}`} style={pieceStyle} />
                )}
                {isSelected && (
                  <div style={indicatorStyle}>
                    <img src={ASSET_MAP.selectionIndicator} alt="Selected" style={pieceStyle} />
                  </div>
                )}
                {isTargetOfValidMove && (
                  <div style={indicatorStyle}>
                    {isCaptureMove ? (
                      <img src={ASSET_MAP.captureIndicator} alt="Capture" style={captureIndicatorImageStyle} />
                    ) : (
                      <div style={dotIndicatorStyle}></div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Rank Labels (1-8) */}
              {square.x === 7 && (
                <div style={{ ...coordinateLabelStyle, gridColumn: '10 / span 1', gridRow: `${gridRow} / span 1` }}>
                  {ranks[square.y]}
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Bottom coordinate labels (A-H) */}
        <div style={{ ...coordinateLabelStyle, gridColumn: '1 / span 1', gridRow: '10 / span 1', visibility: 'hidden' }}></div> {/* Empty corner */}
        {files.map((file, index) => (
          <div key={`file-bottom-${index}`} style={{ ...coordinateLabelStyle, gridColumn: `${index + 2} / span 1`, gridRow: '10 / span 1' }}>
            {file}
          </div>
        ))}
        <div style={{ ...coordinateLabelStyle, gridColumn: '10 / span 1', gridRow: '10 / span 1', visibility: 'hidden' }}></div> {/* Empty corner */}
      </div>
    </div>
  );
};