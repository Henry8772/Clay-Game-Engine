"use server";
import fs from "fs";
import path from "path";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../convex/_generated/api";

const RUNS_DIR = path.join(process.cwd(), ".tmp", "runs");
const DEST_FILE_PATH = path.join(process.cwd(), "app", "generated", "game-slot.tsx");
const PUBLIC_ASSETS_DIR = path.join(process.cwd(), "public", "generated-assets");

export async function loadTestGameAction() {
    console.log("Starting loadTestGameAction...");
    try {
        // 1. Find Latest Run
        if (!fs.existsSync(RUNS_DIR)) {
            console.error("Runs directory not found at:", RUNS_DIR);
            return { success: false, error: "No runs found." };
        }

        const entries = fs.readdirSync(RUNS_DIR)
            .filter(name => fs.statSync(path.join(RUNS_DIR, name)).isDirectory() && name.startsWith("run_"))
            .sort().reverse(); // Sort descending string, usually works for ISO timestamps if format is consistent

        if (entries.length === 0) {
            return { success: false, error: "No run directories found in .tmp/runs" };
        }

        const latestRunId = entries[0];
        const latestRunPath = path.join(RUNS_DIR, latestRunId);
        console.log("Loading from run:", latestRunId);

        const gameSlotPath = path.join(latestRunPath, "game-slot.tsx");
        const workflowOutputPath = path.join(latestRunPath, "workflow_output.json");
        const assetsDir = path.join(latestRunPath, "assets");

        // 2. Validate Files
        if (!fs.existsSync(gameSlotPath)) {
            return { success: false, error: `Missing game-slot.tsx in ${latestRunPath}` };
        }
        if (!fs.existsSync(workflowOutputPath)) {
            return { success: false, error: `Missing workflow_output.json in ${latestRunPath}` };
        }

        // 3. Read Data
        const rawCode = fs.readFileSync(gameSlotPath, "utf-8");
        const workflowData = JSON.parse(fs.readFileSync(workflowOutputPath, "utf-8"));
        const initialState = workflowData.initialState;

        if (!initialState) {
            return { success: false, error: "No initialState in workflow_output.json" };
        }

        // 4. Seeding Convex
        console.log("Seeding Convex DB...");
        // Handle rules which might be a string or object in workflowData
        const rulesText = typeof workflowData.rules === 'string' ? workflowData.rules : JSON.stringify(workflowData.rules);

        await fetchMutation(api.games.reset, {
            initialState: initialState,
            rules: rulesText || "Standard rules",
        });

        // 5. Processing Assets
        console.log("Processing assets...");
        if (!fs.existsSync(PUBLIC_ASSETS_DIR)) {
            fs.mkdirSync(PUBLIC_ASSETS_DIR, { recursive: true });
        }

        if (fs.existsSync(assetsDir)) {
            const assetFiles = fs.readdirSync(assetsDir);
            for (const file of assetFiles) {
                const src = path.join(assetsDir, file);
                const dest = path.join(PUBLIC_ASSETS_DIR, file);
                fs.copyFileSync(src, dest);
            }
        } else {
            console.warn("No assets directory found in run folder.");
        }

        // 6. Write Game Component
        // The game-slot.tsx from the run folder should already be formatted correctly.
        // We just need to make sure it has 'use client' if strictly needed, but usually it does.
        // Let's blindly copy it for now, assuming the architect/workflow output is correct.

        console.log("Writing final code to:", DEST_FILE_PATH);
        fs.writeFileSync(DEST_FILE_PATH, rawCode);

        console.log("Success!");
        return { success: true };

    } catch (e) {
        console.error("Error loading test game:", e);
        return { success: false, error: String(e) };
    }
}
