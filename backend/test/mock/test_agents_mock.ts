
import { LLMClient } from "../../llm/client";
import { runPlannerAgent } from "../../llm/agents/planner";
import { runArchitectAgent } from "../../llm/agents/architect";
import { runArtistAgent } from "../../llm/agents/artist";
import { runMapperAgent } from "../../llm/agents/mapper";
import { runRendererAgent } from "../../llm/agents/renderer";
import { extractGameState } from "../../llm/agents/game_state";
import * as dotenv from "dotenv";

dotenv.config();

// Ensure dummy key
if (!process.env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = "dummy-test-key";
}

async function runTests() {
    const client = new LLMClient("gemini", "gemini-2.5-flash", true);
    console.log("\n🧪 --- TEST: Agents (Mock Mode) ---");

    // 1. Planner
    try {
        console.log("Testing Planner...");
        const designDoc = await runPlannerAgent(client, "Test Input");
        if (designDoc && designDoc.includes("Mock")) {
            console.log("✅ Planner output valid");
        } else {
            console.error("❌ Planner output invalid", designDoc);
        }
    } catch (e) {
        console.error("❌ Planner Error:", e);
    }

    // 2. Architect
    try {
        console.log("Testing Architect...");
        const { initialState, rules } = await runArchitectAgent(client, "Design Doc");
        if (initialState && rules) {
            console.log("✅ Architect output valid");
        } else {
            console.error("❌ Architect output invalid");
        }
    } catch (e) {
        console.error("❌ Architect Error:", e);
    }

    // 3. Artist
    try {
        console.log("Testing Artist...");
        const { imagePrompt, visualLayout } = await runArtistAgent(client, "Design Doc");
        if (imagePrompt && visualLayout) {
            console.log("✅ Artist output valid");
        } else {
            console.error("❌ Artist output invalid");
        }
    } catch (e) {
        console.error("❌ Artist Error:", e);
    }

    // 4. Mapper
    try {
        console.log("Testing Mapper...");
        const { finalState, assetMap } = await runMapperAgent(client, "Prompt", "Doc");
        if (finalState && assetMap) {
            console.log("✅ Mapper output valid");
        } else {
            console.error("❌ Mapper output invalid");
        }
    } catch (e) {
        console.error("❌ Mapper Error:", e);
    }

    // 5. Renderer
    try {
        console.log("Testing Renderer...");
        const reactCode = await runRendererAgent(client, [], {}, {});
        if (reactCode && reactCode.includes("export")) {
            console.log("✅ Renderer output valid");
        } else {
            console.error("❌ Renderer output invalid");
        }
    } catch (e) {
        console.error("❌ Renderer Error:", e);
    }

    // 6. Game State
    try {
        console.log("Testing Game State Extraction...");
        // extractGameState is a generator
        const gen = extractGameState(client, "Rules", "Desc");
        let found = false;
        for await (const chunk of gen) {
            if (chunk.states) {
                found = true;
            }
        }
        if (found) {
            console.log("✅ Game State output valid");
        } else {
            console.error("❌ Game State output invalid (no states)");
        }
    } catch (e) {
        console.error("❌ Game State Error:", e);
    }
}

runTests();
