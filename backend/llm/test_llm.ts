import { LLMClient } from "./src/client";
import { extractGameState } from "./src/agents/game_state";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config();

async function runMockTest() {
    console.log("\n🧪 --- TEST: Mock Response ---");
    const client = new LLMClient("gemini", "gemini-2.5-flash", true); // Debug mode ON for mocks

    const rules = "Tic Tac Toe rules...";
    const description = "A simple 3x3 grid game.";

    try {
        const generator = extractGameState(client, rules, description, true); // useMock = true
        console.log("Stream started...");
        for await (const partial of generator) {
            if (partial.states && partial.states.length > 0) {
                console.log(`Received ${partial.states.length} states from mock.`);
            }
        }
        console.log("✅ Mock Test PASSED");
    } catch (error) {
        console.error("❌ Mock Test FAILED:", error);
    }
}

async function runLiveTest() {
    console.log("\n🧪 --- TEST: Live/Actual Response ---");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes("dummy")) {
        console.warn("⚠️  Skipping Live Test: Invalid or Dummy GEMINI_API_KEY detected.");
        console.warn("   Please set a valid GEMINI_API_KEY in backend/llm/.env to run this test.");
        return;
    }

    // Debug mode false to force live call, useMock false
    const client = new LLMClient("gemini", "gemini-2.5-flash", false);

    const rules = "Players take turns dropping colored discs into a vertically suspended 7x6 grid. The objective is to be the first to form a horizontal, vertical, or diagonal line of four of one's own discs.";
    const description = "Connect Four game logic.";

    try {
        const generator = extractGameState(client, rules, description, false); // useMock = false
        console.log("Stream started...");
        let stateCount = 0;
        for await (const partial of generator) {
            if (partial.states) {
                stateCount = partial.states.length;
                process.stdout.write(`\rStates found: ${stateCount}`);
            }
        }
        console.log("\n");
        if (stateCount > 0) {
            console.log("✅ Live Test PASSED (Got valid states)");
        } else {
            console.log("⚠️  Live Test finished but no states were extracted.");
        }
    } catch (error) {
        console.error("\n❌ Live Test FAILED:", error);
    }
}

async function main() {
    await runMockTest();
    await runLiveTest();
}

main();
