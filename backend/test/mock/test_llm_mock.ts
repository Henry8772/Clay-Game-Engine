
import { LLMClient } from "../../llm/client";
import * as dotenv from "dotenv";

dotenv.config();

async function testLLMMock() {
    console.log("\n🧪 --- TEST: LLM Client (Mock Mode) ---");

    // 1. Initialize Client in Debug Mode
    const client = new LLMClient("gemini", "gemini-2.5-flash", true);

    // 2. Mock a response manually if client allows, or test behavior
    // The client.streamJson method takes a 'mockResponse' argument.
    // We will verify that it returns exactly that.

    const mockData = { test: "success", value: 42 };

    console.log("Running streamJson with explicit mock data...");

    const stream = client.streamJson<typeof mockData>(
        "System Prompt",
        "User Input",
        null, // Schema
        "test_agent",
        mockData // direct mock
    );

    let received = null;
    for await (const chunk of stream) {
        received = chunk;
    }

    if (received && received.test === "success" && received.value === 42) {
        console.log("✅ LLM Mock Test PASSED: Received expected mock data.");
    } else {
        console.error("❌ LLM Mock Test FAILED: Did not receive expected data.", received);
        process.exit(1);
    }
}

testLLMMock();
