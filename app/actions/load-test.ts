"use server";
import fs from "fs";
import path from "path";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../convex/_generated/api";

/**
 * Recursively copies a directory or file.
 */
function copyRecursiveSync(src: string, dest: string) {
    if (!fs.existsSync(src)) return;

    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        const entries = fs.readdirSync(src);
        for (const entry of entries) {
            // Ignore system files like .DS_Store
            if (entry === '.DS_Store') continue;

            const srcPath = path.join(src, entry);
            const destPath = path.join(dest, entry);
            copyRecursiveSync(srcPath, destPath);
        }
    } else {
        // Ensure parent directory exists
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(src, dest);
    }
}

export async function loadTestGameAction(runId: string = "experiment-3") {
    console.log(`Starting loadTestGameAction for run: ${runId} ...`);
    try {
        // 1. Define Paths
        // We load from the static folder which serves as our "Golden Master"
        const EXPERIMENT_DIR = path.join(process.cwd(), "backend", "test", "real", runId);
        const GAMESTATE_PATH = path.join(EXPERIMENT_DIR, "gamestate.json");
        const ASSETS_SRC_DIR = path.join(EXPERIMENT_DIR, "extracted");

        const PUBLIC_ASSETS_DIR = path.join(process.cwd(), "public", "generated-assets");

        // 2. Validate Source Files
        if (!fs.existsSync(GAMESTATE_PATH)) {
            return { success: false, error: `Missing gamestate.json in ${EXPERIMENT_DIR}` };
        }

        // 3. Read Data
        const gameState = JSON.parse(fs.readFileSync(GAMESTATE_PATH, "utf-8"));

        // 4. Seeding Convex
        console.log(`Seeding Convex DB with ${runId} data...`);
        // Use a generic ruleset
        const rulesText = "All unit can one shot to kill any other unit.";

        await fetchMutation(api.games.reset, {
            initialState: gameState,
            rules: rulesText,
        });

        // 5. Processing Assets
        console.log("Processing assets...");
        if (!fs.existsSync(PUBLIC_ASSETS_DIR)) {
            fs.mkdirSync(PUBLIC_ASSETS_DIR, { recursive: true });
        }

        if (fs.existsSync(ASSETS_SRC_DIR)) {
            // Use recursive copy to handle subdirectories and robustness
            copyRecursiveSync(ASSETS_SRC_DIR, PUBLIC_ASSETS_DIR);
            console.log(`Copied assets from ${ASSETS_SRC_DIR} to ${PUBLIC_ASSETS_DIR}`);
        } else {
            console.warn(`No assets directory found at ${ASSETS_SRC_DIR}`);
        }

        console.log(`Success! ${runId} loaded.`);
        return { success: true };

    } catch (e) {
        console.error("Error loading test game:", e);
        return { success: false, error: String(e) };
    }
}
