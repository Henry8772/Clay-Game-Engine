
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runAssetGeneratorAgent } from "../../../llm/agents/asset_generator";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: 04 Asset Generator Agent', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real Asset Generator Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should generate asset from reference image', async () => {
        const fs = await import("fs");
        const path = await import("path");
        const entityList = [
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

        // filter by renderType == ASSET
        const assetList = entityList.filter(entity => entity.renderType === "ASSET");
        // Ensure .tmp directory exists or use a mock image if not present?
        // The previous test relied on a file existing. 
        // We will keep the same logic but handle the missing file gracefully or expect it to be there if user provided context implies it.
        const imagePath = path.resolve(__dirname, "../../../.tmp/ui_designer_output.png");

        if (!fs.existsSync(imagePath)) {
            console.warn("⚠️  Skipping test: Image not found at " + imagePath);
            return;
        }

        const referenceImageBuffer = fs.readFileSync(imagePath);
        console.log(`[Real] Loaded image from: ${imagePath} (${referenceImageBuffer.length} bytes)`);

        const targetAsset = assetList[0];
        console.log(`[Real] Selected Asset for Test: ${targetAsset.name} (${targetAsset.id})`);
        console.log(`[Real] Visual Prompt: ${targetAsset.visualPrompt}`);

        const prompt = targetAsset.visualPrompt;

        // Use the new agent function
        const resultImageBuffer = await runAssetGeneratorAgent(client, prompt, referenceImageBuffer);

        console.log(`[Real] Generated image (${resultImageBuffer.length} bytes)`);
        expect(resultImageBuffer).toBeDefined();
        expect(resultImageBuffer.length).toBeGreaterThan(0);

        // Save into .tmp/asset_image.png
        const assetImagePath = path.resolve(__dirname, `../../../.tmp/asset_image_${targetAsset.id}.png`);
        fs.writeFileSync(assetImagePath, resultImageBuffer);
        console.log(`[Real] Saved image to: ${assetImagePath}`);
    });
});
