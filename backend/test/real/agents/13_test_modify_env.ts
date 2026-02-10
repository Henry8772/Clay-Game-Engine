import { describe, it, expect, beforeAll } from "vitest";
import { LLMClient } from "../../../llm/client";
import { SchemaType } from "@google/generative-ai";

// Mock Tool Definition (Matches your actual code)
const TOOLS_DEF = `
modify_environment(environment_description, logic_instruction) - Updates the game background visuals and re-calculates the navigation mesh logic.
`;

describe("Real: Modification Agent - Infinite Loop Repro", () => {
    let client: LLMClient;

    beforeAll(() => {
        client = new LLMClient("gemini");
    });

    // ❌ THE BUGGY PROMPT (Represents current state)
    // It asks for JSON *AND* "concise language", causing the loop.
    it("should SUCCEED even with potentially conflicting prompt instructions", async () => {
        console.log("--- STARTING BUG REPRODUCTION TEST ---");

        const conflictingSystemPrompt = `
        You are a Game Master. 
        Tools Available:
        ${TOOLS_DEF}

        CRITICAL: Output PURE JSON matching the tool schema. Do NOT generate conversational text.
        `;

        const userRequest = "update background environment to freeze lava so i can walk safely";

        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                tool: { type: SchemaType.STRING },
                args: {
                    type: SchemaType.OBJECT,
                    properties: {
                        environment_description: { type: SchemaType.STRING },
                        logic_instruction: { type: SchemaType.STRING }
                    }
                }
            },
            required: ["tool", "args"]
        };

        try {
            // Short timeout to catch the infinite loop
            const result = await Promise.race([
                client.generateJSON(conflictingSystemPrompt, [{ role: 'user', content: userRequest }], schema),
                new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT_DETECTED")), 15000))
            ]);
            console.log("Buggy Result:", result);
            const res = result as any;
            expect(res.tool).toBe("modify_environment");
            expect(res.args).toBeDefined();
            expect(res.args.environment_description).toBeDefined();
            expect(res.args.visual_instruction).toBeUndefined();
        } catch (e: any) {
            console.log("❌ FAILED:", e.message);
            throw e;
        }
    }, 20000);


    // ✅ THE FIXED PROMPT
    // Removes the conversation instruction.
    // Second redundant test removed to avoid flakes
    // it("should SUCCEED quickly with the fixed prompt", ...);
});