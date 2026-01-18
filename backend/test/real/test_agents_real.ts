
import { LLMClient } from "../../llm/client";
import { runPlannerAgent } from "../../llm/agents/planner";
import { runArchitectAgent } from "../../llm/agents/architect";
import { runArtistAgent } from "../../llm/agents/artist";
import { runMapperAgent } from "../../llm/agents/mapper";
import { runRendererAgent } from "../../llm/agents/renderer";
import * as dotenv from "dotenv";

dotenv.config();

async function runRealAgentTests() {
    console.log("\n🧪 --- TEST: Agents (Real Mode) ---");

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes("dummy")) {
        console.warn("⚠️  Skipping Real Agent Tests: No valid GEMINI_API_KEY found.");
        return;
    }

    const client = new LLMClient("gemini", "gemini-2.5-flash", false);

    // 1. Planner
    try {
        console.log("Testing Planner (Real)...");
        const designDoc = await runPlannerAgent(client, "A simple Pong game.");
        if (designDoc && designDoc.length > 10) {
            console.log("✅ Planner passed");
        } else {
            console.error("❌ Planner failed", designDoc);
        }
    } catch (e) {
        console.error("❌ Planner Error:", e);
    }

    // 2. Architect
    const sampleDoc = "# Game: Pong\n## Theme\nRetro.\n## Game Loop\nBall bounces.";
    try {
        console.log("Testing Architect (Real)...");
        const res = await runArchitectAgent(client, sampleDoc);
        if (res.initialState && res.rules) {
            console.log("✅ Architect passed");
        } else {
            console.error("❌ Architect failed", res);
        }
    } catch (e) {
        console.error("❌ Architect Error:", e);
    }

    // 3. Artist
    try {
        console.log("Testing Artist (Real)...");
        const res = await runArtistAgent(client, sampleDoc);
        if (res.imagePrompt && Array.isArray(res.visualLayout)) {
            console.log("✅ Artist passed");
        } else {
            console.error("❌ Artist failed", res);
        }
    } catch (e) {
        console.error("❌ Artist Error:", e);
    }

    // 4. Mapper
    try {
        console.log("Testing Mapper (Real)...");
        // We simulate the mapping without real image gen (mapper takes prompts)
        const res = await runMapperAgent(client, "Retro Pong", sampleDoc);
        if (res.finalState && res.assetMap) {
            console.log("✅ Mapper passed");
        } else {
            console.error("❌ Mapper failed", res);
        }
    } catch (e) {
        console.error("❌ Mapper Error:", e);
    }

    // 5. Renderer
    try {
        console.log("Testing Renderer (Real)...");
        const res = await runRendererAgent(client, ["paddle", "ball"], { score: 0 }, { paddle: "p.png" });
        if (res && res.includes("React")) {
            console.log("✅ Renderer passed");
        } else {
            console.error("❌ Renderer failed", res);
        }
    } catch (e) {
        console.error("❌ Renderer Error:", e);
    }
}

runRealAgentTests();
