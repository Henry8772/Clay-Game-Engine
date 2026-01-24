"use server";
import fs from "fs";
import path from "path";
import { compileGenerationGraph } from "../../backend/llm/graph/workflow";
import { LLMClient } from "../../backend/llm/client";

export async function generateGameAction(prompt: string) {
    try {
        const client = new LLMClient();
        const app = compileGenerationGraph();

        console.log("Invoking generation graph with prompt:", prompt);
        // Use Mock mode for now as per plan to ensure we get reactCode
        const result = await app.invoke(
            { userInput: prompt },
            { configurable: { client, useMock: true } }
        );

        if (result.reactCode) {
            // DEFINING THE PATH:
            const filePath = path.join(process.cwd(), "app", "generated", "game-slot.tsx");

            // ADDING IMPORTS:
            // The LLM might not include 'import React', so we force it just in case.
            const fileContent = `
        "use client";
        import React, { useState, useEffect, useRef } from "react";
        import { LucideIcon, Heart, Star, Sparkles, Zap, Ghost } from "lucide-react"; // Add commonly used icons

        ${result.reactCode}
      `;

            // WRITING THE FILE:
            console.log("Writing generated code to:", filePath);
            fs.writeFileSync(filePath, fileContent);

            return { success: true };
        } else {
            console.error("No reactCode returned from graph execution.");
        }
    } catch (error) {
        console.error("Error in generateGameAction:", error);
    }
    return { success: false };
}
