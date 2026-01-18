
import { LLMClient } from "../../llm/client";
import { SchemaType } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

async function testLLMReal() {
    console.log("\n🧪 --- TEST: LLM Client (Real Mode) ---");

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes("dummy")) {
        console.warn("⚠️  Skipping Real Test: No valid GEMINI_API_KEY found.");
        return;
    }

    const client = new LLMClient("gemini", "gemini-2.5-flash", false); // Debug false force real execution? 
    // Wait, debugMode doesn't force mock unless we pass mockResponse or tryGetMock succeeds.
    // If debugMode is false, tryGetMock checks fail, so it runs real.

    // Schema
    const schema = {
        type: SchemaType.OBJECT,
        properties: {
            colors: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            count: { type: SchemaType.NUMBER }
        },
        required: ["colors", "count"]
    };

    const prompt = "List 3 colors of rankbow and the count 3.";

    console.log("Stream started...");
    const stream = client.streamJson<any>(
        "You are a helpful assistant.",
        prompt,
        schema,
        "real_test_agent"
    );

    let result = null;
    for await (const chunk of stream) {
        result = chunk;
    }

    if (result && Array.isArray(result.colors) && typeof result.count === 'number') {
        console.log("✅ Real LLM Test PASSED: Received valid schema match.", result);
    } else {
        console.error("❌ Real LLM Test FAILED: Invalid schema.", result);
        process.exit(1);
    }
}

testLLMReal();
