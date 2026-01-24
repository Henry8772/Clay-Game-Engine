
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runRendererAgent } from "../../../llm/agents/renderer";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: 06 Renderer Agent', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real Renderer Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should generate React code from state and assets', async () => {
        const layout = [
            "Game Board",
            "White King",
            "White Queen",
            "White Rook",
            "White Bishop",
            "White Knight",
            "White Pawn",
            "Black King",
            "Black Queen",
            "Black Rook",
            "Black Bishop",
            "Black Knight",
            "Black Pawn",
            "Player Indicators",
            "Captured Pieces Display",
            "Game Over/Win/Draw Message"
        ]
        const state = {
            "board": {
                "a1": {
                    "piece": {
                        "type": "rook",
                        "color": "white"
                    }
                },
                "b1": {
                    "piece": {
                        "type": "knight",
                        "color": "white"
                    }
                },
                "c1": {
                    "piece": {
                        "type": "bishop",
                        "color": "white"
                    }
                },
                "d1": {
                    "piece": {
                        "type": "queen",
                        "color": "white"
                    }
                },
                "e1": {
                    "piece": {
                        "type": "king",
                        "color": "white"
                    }
                },
                "f1": {
                    "piece": {
                        "type": "bishop",
                        "color": "white"
                    }
                },
                "g1": {
                    "piece": {
                        "type": "knight",
                        "color": "white"
                    }
                },
                "h1": {
                    "piece": {
                        "type": "rook",
                        "color": "white"
                    }
                },
                "a2": {
                    "piece": {
                        "type": "pawn",
                        "color": "white"
                    }
                },
                "b2": {
                    "piece": {
                        "type": "pawn",
                        "color": "white"
                    }
                },
                "c2": {
                    "piece": {
                        "type": "pawn",
                        "color": "white"
                    }
                },
                "d2": {
                    "piece": {
                        "type": "pawn",
                        "color": "white"
                    }
                },
                "e2": {
                    "piece": {
                        "type": "pawn",
                        "color": "white"
                    }
                },
                "f2": {
                    "piece": {
                        "type": "pawn",
                        "color": "white"
                    }
                },
                "g2": {
                    "piece": {
                        "type": "pawn",
                        "color": "white"
                    }
                },
                "h2": {
                    "piece": {
                        "type": "pawn",
                        "color": "white"
                    }
                },
                "a3": null,
                "b3": null,
                "c3": null,
                "d3": null,
                "e3": null,
                "f3": null,
                "g3": null,
                "h3": null,
                "a4": null,
                "b4": null,
                "c4": null,
                "d4": null,
                "e4": null,
                "f4": null,
                "g4": null,
                "h4": null,
                "a5": null,
                "b5": null,
                "c5": null,
                "d5": null,
                "e5": null,
                "f5": null,
                "g5": null,
                "h5": null,
                "a6": null,
                "b6": null,
                "c6": null,
                "d6": null,
                "e6": null,
                "f6": null,
                "g6": null,
                "h6": null,
                "a7": {
                    "piece": {
                        "type": "pawn",
                        "color": "black"
                    }
                },
                "b7": {
                    "piece": {
                        "type": "pawn",
                        "color": "black"
                    }
                },
                "c7": {
                    "piece": {
                        "type": "pawn",
                        "color": "black"
                    }
                },
                "d7": {
                    "piece": {
                        "type": "pawn",
                        "color": "black"
                    }
                },
                "e7": {
                    "piece": {
                        "type": "pawn",
                        "color": "black"
                    }
                },
                "f7": {
                    "piece": {
                        "type": "pawn",
                        "color": "black"
                    }
                },
                "g7": {
                    "piece": {
                        "type": "pawn",
                        "color": "black"
                    }
                },
                "h7": {
                    "piece": {
                        "type": "pawn",
                        "color": "black"
                    }
                },
                "a8": {
                    "piece": {
                        "type": "rook",
                        "color": "black"
                    }
                },
                "b8": {
                    "piece": {
                        "type": "knight",
                        "color": "black"
                    }
                },
                "c8": {
                    "piece": {
                        "type": "bishop",
                        "color": "black"
                    }
                },
                "d8": {
                    "piece": {
                        "type": "queen",
                        "color": "black"
                    }
                },
                "e8": {
                    "piece": {
                        "type": "king",
                        "color": "black"
                    }
                },
                "f8": {
                    "piece": {
                        "type": "bishop",
                        "color": "black"
                    }
                },
                "g8": {
                    "piece": {
                        "type": "knight",
                        "color": "black"
                    }
                },
                "h8": {
                    "piece": {
                        "type": "rook",
                        "color": "black"
                    }
                }
            },
            "players": {
                "white": {
                    "id": "player_white",
                    "name": "White Player",
                    "color": "white",
                    "capturedPieces": []
                },
                "black": {
                    "id": "player_black",
                    "name": "Black Player",
                    "color": "black",
                    "capturedPieces": []
                }
            },
            "currentPlayer": "white",
            "gameStatus": "playing"
        };
        const entityList = [
            {
                "id": "board_square_light",
                "name": "Light Board Square",
                "visualPrompt": "A clean, light-colored pixel art chess board square, representing wood or light stone.",
                "description": "One of the 64 squares on the chessboard, with a light visual texture.",
                "renderType": "ASSET"
            },
            // ... truncated for brevity in call but should include full list in real edit if changing variable name ...
            // Wait, I should not replace the whole list content if I can avoid it to save tokens, but I need to rename the variable.
            // I'll keep the variable name 'assets' in the definition for now to avoid huge diff, or rename it properly.
            // Better to rename it to `entityList` for clarity as that is what it is.
            // I will use `entityList` variable.
            {
                "id": "board_square_dark",
                "name": "Dark Board Square",
                "visualPrompt": "A clean, dark-colored pixel art chess board square, representing dark wood or dark stone.",
                "description": "One of the 64 squares on the chessboard, with a dark visual texture.",
                "renderType": "ASSET"
            },
            {
                "id": "king_white",
                "name": "White King",
                "visualPrompt": "A detailed pixel art chess king piece, white, with a clear crown symbol on top.",
                "description": "The White King piece.",
                "renderType": "ASSET"
            },
            {
                "id": "king_black",
                "name": "Black King",
                "visualPrompt": "A detailed pixel art chess king piece, black, with a clear crown symbol on top.",
                "description": "The Black King piece.",
                "renderType": "ASSET"
            },
            {
                "id": "queen_white",
                "name": "White Queen",
                "visualPrompt": "A detailed pixel art chess queen piece, white, with an ornate crown.",
                "description": "The White Queen piece.",
                "renderType": "ASSET"
            },
            {
                "id": "queen_black",
                "name": "Black Queen",
                "visualPrompt": "A detailed pixel art chess queen piece, black, with an ornate crown.",
                "description": "The Black Queen piece.",
                "renderType": "ASSET"
            },
            {
                "id": "rook_white",
                "name": "White Rook",
                "visualPrompt": "A detailed pixel art chess rook (castle) piece, white, with a crenellated top.",
                "description": "The White Rook piece.",
                "renderType": "ASSET"
            },
            {
                "id": "rook_black",
                "name": "Black Rook",
                "visualPrompt": "A detailed pixel art chess rook (castle) piece, black, with a crenellated top.",
                "description": "The Black Rook piece.",
                "renderType": "ASSET"
            },
            {
                "id": "bishop_white",
                "name": "White Bishop",
                "visualPrompt": "A detailed pixel art chess bishop piece, white, with a split mitre.",
                "description": "The White Bishop piece.",
                "renderType": "ASSET"
            },
            {
                "id": "bishop_black",
                "name": "Black Bishop",
                "visualPrompt": "A detailed pixel art chess bishop piece, black, with a split mitre.",
                "description": "The Black Bishop piece.",
                "renderType": "ASSET"
            },
            {
                "id": "knight_white",
                "name": "White Knight",
                "visualPrompt": "A detailed pixel art chess knight piece, white, shaped like a horse's head.",
                "description": "The White Knight piece.",
                "renderType": "ASSET"
            },
            {
                "id": "knight_black",
                "name": "Black Knight",
                "visualPrompt": "A detailed pixel art chess knight piece, black, shaped like a horse's head.",
                "description": "The Black Knight piece.",
                "renderType": "ASSET"
            },
            {
                "id": "pawn_white",
                "name": "White Pawn",
                "visualPrompt": "A detailed pixel art chess pawn piece, white, with a simple round head.",
                "description": "The White Pawn piece.",
                "renderType": "ASSET"
            },
            {
                "id": "pawn_black",
                "name": "Black Pawn",
                "visualPrompt": "A detailed pixel art chess pawn piece, black, with a simple round head.",
                "description": "The Black Pawn piece.",
                "renderType": "ASSET"
            },
            {
                "id": "turn_indicator",
                "name": "Turn Indicator",
                "visualPrompt": "A UI element displaying whose turn it is, such as a text label or a highlighted player panel.",
                "description": "Indicates the current player whose turn it is to move.",
                "renderType": "COMPONENT"
            },
            {
                "id": "player_white_name_display",
                "name": "White Player Name",
                "visualPrompt": "A UI text component displaying the White player's name.",
                "description": "Displays the name for the White player.",
                "renderType": "COMPONENT"
            },
            {
                "id": "player_black_name_display",
                "name": "Black Player Name",
                "visualPrompt": "A UI text component displaying the Black player's name.",
                "description": "Displays the name for the Black player.",
                "renderType": "COMPONENT"
            },
            {
                "id": "captured_pieces_panel_white",
                "name": "White Captured Pieces Display",
                "visualPrompt": "A UI panel for the White player to display captured opponent pieces.",
                "description": "Shows the pieces captured by the White player.",
                "renderType": "COMPONENT"
            },
            {
                "id": "captured_pieces_panel_black",
                "name": "Black Captured Pieces Display",
                "visualPrompt": "A UI panel for the Black player to display captured opponent pieces.",
                "description": "Shows the pieces captured by the Black player.",
                "renderType": "COMPONENT"
            },
            {
                "id": "game_over_message_display",
                "name": "Game Over Message",
                "visualPrompt": "A UI overlay or banner displaying game outcomes like 'Checkmate', 'Stalemate', or 'Draw'.",
                "description": "Informs players about the end of the game and its result.",
                "renderType": "COMPONENT"
            },
            {
                "id": "valid_move_highlight_effect",
                "name": "Valid Move Highlight",
                "visualPrompt": "A glowing border or subtle color change effect to highlight squares where a selected piece can legally move.",
                "description": "Highlights possible destination squares for a selected chess piece.",
                "renderType": "COMPONENT"
            }
        ];

        // Transform Entity List to Asset Map (simulating Swarm output)
        const assetMap = entityList.reduce((acc: any, entity) => {
            if (entity.renderType === 'ASSET') {
                acc[entity.id] = `assets/${entity.id}.png`;
            }
            return acc;
        }, {});

        console.log(`[Real] Renderer Input Layout:`, layout);
        console.log(`[Real] Renderer Asset Map Keys:`, Object.keys(assetMap));

        const res = await runRendererAgent(client, layout, state, assetMap);

        console.log(`[Real] Renderer Output Code:\n`, res);

        expect(res).toBeDefined();
        expect(res).toContain("React");

        const fs = await import("fs");
        const path = await import("path");
        const outputPath = path.resolve(__dirname, "../../../.tmp/test.ts");

        // Ensure dir exists (it likely does from previous tests, but good practice)
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });

        fs.writeFileSync(outputPath, res);
        console.log(`[Real] Saved React code to: ${outputPath}`);
    });
});
