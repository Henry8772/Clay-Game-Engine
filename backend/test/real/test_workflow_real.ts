
import { compileGenerationGraph } from "../../llm/graph/workflow";
import { GraphState } from "../../llm/graph/state";
import { LLMClient } from "../../llm/client";
import * as dotenv from "dotenv";

dotenv.config();

async function runWorkflowReal() {
    console.log("\n🧪 --- TEST: Workflow E2E (Real Mode) ---");

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes("dummy")) {
        console.warn("⚠️  Skipping Real Workflow Test: No valid GEMINI_API_KEY found.");
        return;
    }

    const client = new LLMClient("gemini", "gemini-2.5-flash", false);
    const userInput = "A minimal Pong game.";

    const app = compileGenerationGraph();

    console.log("Graph compiled. Invoking with useMock: false (REAL CALLS)...");
    console.log("This may take 30-60 seconds...");

    try {
        const result = await app.invoke({
            userInput: userInput
        }, {
            configurable: {
                client,
                useMock: false
            }
        }) as unknown as GraphState;

        console.log("\n📊 --- Results ---");

        // Verify key components
        if (result.designDoc && result.initialState && result.reactCode) {
            console.log("✅ Workflow E2E Real PASSED");
            console.log("Summary:", {
                designDocLength: result.designDoc.length,
                rules: result.rules ? "Present" : "Missing",
                reactCodeLength: result.reactCode.length
            });
        } else {
            console.error("❌ Workflow E2E Real FAILED: Missing fields", Object.keys(result));
            process.exit(1);
        }

    } catch (error) {
        console.error("❌ Error running Workflow E2E:", error);
        process.exit(1);
    }
}

runWorkflowReal();
