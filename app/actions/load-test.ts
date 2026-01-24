"use server";
import fs from "fs";
import path from "path";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../convex/_generated/api";

const TMP_DIR = path.join(process.cwd(), "backend", ".tmp", "real_chain");
const RENDERER_OUTPUT_PATH = path.join(TMP_DIR, "renderer_output.tsx");
const ARCHITECT_OUTPUT_PATH = path.join(TMP_DIR, "architect_output.json");
const ASSET_OUTPUT_PATH = path.join(TMP_DIR, "asset_generator_output.json");
const ASSETS_SOURCE_DIR = path.join(TMP_DIR, "assets");

const DEST_FILE_PATH = path.join(process.cwd(), "app", "generated", "game-slot.tsx");
const PUBLIC_ASSETS_DIR = path.join(process.cwd(), "public", "generated-assets");

export async function loadTestGameAction() {
    console.log("Starting loadTestGameAction...");
    try {
        // 1. Check for files
        if (!fs.existsSync(RENDERER_OUTPUT_PATH)) {
            console.error("Renderer output missing at:", RENDERER_OUTPUT_PATH);
            return { success: false, error: "Renderer output not found." };
        }
        if (!fs.existsSync(ARCHITECT_OUTPUT_PATH)) {
            console.error("Architect output missing at:", ARCHITECT_OUTPUT_PATH);
            return { success: false, error: "Architect output (state) not found." };
        }

        // 2. Read contents
        console.log("Reading files...");
        const rawCode = fs.readFileSync(RENDERER_OUTPUT_PATH, "utf-8");
        const architectData = JSON.parse(fs.readFileSync(ARCHITECT_OUTPUT_PATH, "utf-8"));

        let assetMap: Record<string, string> = {};
        if (fs.existsSync(ASSET_OUTPUT_PATH)) {
            assetMap = JSON.parse(fs.readFileSync(ASSET_OUTPUT_PATH, "utf-8"));
        }

        // 3. Extract Initial State
        const initialState = architectData.initialState;
        if (!initialState) {
            return { success: false, error: "No initialState in architect output." };
        }

        // --- CONVEX SEEDING ---
        console.log("Seeding Convex DB...");
        await fetchMutation(api.games.reset, {
            initialState: initialState,
            rules: architectData.rules || "Standard rules",
        });
        // ----------------------

        // 4. Handle Assets
        console.log("Processing assets...");
        if (!fs.existsSync(PUBLIC_ASSETS_DIR)) {
            fs.mkdirSync(PUBLIC_ASSETS_DIR, { recursive: true });
        }

        const newAssetMap: Record<string, string> = {};
        Object.keys(assetMap).forEach(key => {
            const originalPath = assetMap[key];
            const fileName = path.basename(originalPath);

            if (fs.existsSync(originalPath)) {
                fs.copyFileSync(originalPath, path.join(PUBLIC_ASSETS_DIR, fileName));
            }

            newAssetMap[key] = `/generated-assets/${fileName}`;
        });

        // 5. Construct New Content
        console.log("Injecting data...");
        let finalCode = rawCode;

        // Ensure use client
        if (!finalCode.includes('"use client"')) {
            finalCode = `"use client";\n` + finalCode;
        }

        // Ensure icon imports
        if (!finalCode.includes("lucide-react") && (finalCode.includes("<Heart") || finalCode.includes("Lucide"))) {
            finalCode = `import { LucideIcon, Heart, Star, Sparkles, Zap, Ghost, ArrowRight, ArrowLeft, ArrowUp, ArrowDown } from "lucide-react";\n` + finalCode;
        }

        // Constants Injection
        const constants = `
    export const INITIAL_STATE = ${JSON.stringify(initialState)};
    export const ASSET_MAP = ${JSON.stringify(newAssetMap)};
    export const GAME_RULES = ${JSON.stringify(architectData.rules || "Standard game rules")};
    `;

        // Replacement Logic - Use Regex for flexibility
        let componentRenamed = false;

        // Pattern for: export const Game = ...
        if (/export\s+const\s+Game\s*=/.test(finalCode)) {
            finalCode = finalCode.replace(/export\s+const\s+Game\s*=/, "const _Game =");
            componentRenamed = true;
        }
        // Pattern for: export function Game ...
        else if (/export\s+function\s+Game/.test(finalCode)) {
            finalCode = finalCode.replace(/export\s+function\s+Game/, "function _Game");
            componentRenamed = true;
        }
        // Pattern for: export default function Game ...
        else if (/export\s+default\s+function\s+Game/.test(finalCode)) {
            finalCode = finalCode.replace(/export\s+default\s+function\s+Game/, "function _Game");
            componentRenamed = true;
        }
        // Pattern for: export default function (...)
        else if (/export\s+default\s+function/.test(finalCode)) {
            finalCode = finalCode.replace(/export\s+default\s+function/, "function _Game");
            componentRenamed = true;
        }

        if (!componentRenamed) {
            console.warn("Could not find standard 'Game' export pattern to rename via Regex.");
            // Try fallback string replacement as last resort if regex failed oddly
            if (finalCode.includes("export const Game")) {
                finalCode = finalCode.replace("export const Game", "const _Game");
                componentRenamed = true;
            }
        }

        if (!componentRenamed) {
            console.error("FAILED to rename Game component. Injection will likely fail.");
            return { success: false, error: "Could not rename Game component." };
        }

        // Inject useEffect for internal state sync
        // Locate useState<GameState>(initialState); or similar and inject useEffect
        // Note: The previous task planned to add useEffect here. 
        // PROMPT: "Inject Logic: Add a step to inject a useEffect hook into the _Game component."
        // We do this by regex replacement on the final string.

        // Find the start of the component to inject imports if needed, but we already added 'use client'

        // Find: useState<GameState>(initialState);
        // Replace with: useState<GameState>(initialState); useEffect(() => { setGameState(initialState); }, [initialState]);

        if (finalCode.includes("useState<GameState>(initialState)")) {
            finalCode = finalCode.replace(
                "useState<GameState>(initialState);",
                "useState<GameState>(initialState); useEffect(() => { setGameState(initialState); }, [initialState]);"
            );
        } else if (finalCode.includes("useState(initialState)")) {
            finalCode = finalCode.replace(
                "useState(initialState);",
                "useState(initialState); useEffect(() => { setGameState(initialState); }, [initialState]);"
            );
        }


        const wrapper = `
    export const Game = (props: { initialState?: any, assetMap?: any }) => {
        const state = props.initialState || INITIAL_STATE;
        const assets = props.assetMap || ASSET_MAP;
        return <_Game initialState={state} assetMap={assets} />;
    };
    `;

        finalCode += "\n" + constants + "\n" + wrapper;

        console.log("Writing final code to:", DEST_FILE_PATH);
        fs.writeFileSync(DEST_FILE_PATH, finalCode);
        console.log("Success!");

        return { success: true };

    } catch (e) {
        console.error("Error loading test game:", e);
        return { success: false, error: String(e) };
    }
}
