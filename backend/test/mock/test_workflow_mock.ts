
import { compileGenerationGraph } from "../../llm/graph/workflow";
import { GraphState } from "../../llm/graph/state";
import { LLMClient } from "../../llm/client";
import * as dotenv from "dotenv";

dotenv.config();

async function runE2EMock() {
    console.log("\n🧪 --- TEST: Workflow E2E (Mock Mode) ---");

    if (!process.env.GEMINI_API_KEY) {
        process.env.GEMINI_API_KEY = "dummy-test-key";
    }

    const client = new LLMClient("gemini", "gemini-2.5-flash", true);
    const userInput = "Test Input";

    const app = compileGenerationGraph();

    console.log("Graph compiled. Invoking with useMock: true...");

    try {
        const result = await app.invoke({
            userInput: userInput
        }, {
            configurable: {
                client,
                useMock: true
            }
        }) as unknown as GraphState;

        console.log("\n📊 --- Results ---");

        if (result.designDoc && result.initialState && result.rules && result.imagePrompt) {
            console.log("✅ Workflow E2E Mock PASSED");
        } else {
            console.error("❌ Workflow E2E Mock FAILED: Missing fields", result);
            process.exit(1);
        }

    } catch (error) {
        console.error("❌ Error running Workflow E2E:", error);
        process.exit(1);
    }
}

runE2EMock();
