"use server";
import fs from "fs";
import path from "path";
import { compileGenerationGraph } from "../../backend/llm/graph/workflow";
import { LLMClient } from "../../backend/llm/client";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { revalidatePath } from "next/cache";

export async function generateGameAction(prompt: string) {
    try {
        const client = new LLMClient();
        const app = compileGenerationGraph();

        console.log("Invoking generation graph with prompt:", prompt);

        // Use Mock mode for now mostly, but Real is supported via ENV.
        // We set useMock to true by default unless we want to burn tokens.
        // Adjust this logic as needed.
        const useMock = process.env.USE_MOCK === "true";

        const result = await app.invoke(
            { userInput: prompt },
            { configurable: { client, useMock: true } } // defaulting to Mock for safety during dev
        );

        if (result.reactCode) {
            // 1. Process Assets (Mirroring Test Logic)
            const publicAssetsDir = path.join(process.cwd(), "public", "generated-assets");
            if (!fs.existsSync(publicAssetsDir)) {
                fs.mkdirSync(publicAssetsDir, { recursive: true });
            }

            const frontendAssetMap: Record<string, string> = {};

            if (result.assetMap) {
                for (const [key, sourcePath] of Object.entries(result.assetMap as Record<string, string>)) {
                    let absSourcePath = sourcePath;
                    if (!path.isAbsolute(sourcePath)) {
                        absSourcePath = path.resolve(process.cwd(), "backend", sourcePath); // Assuming relative to backend root or cwd
                        if (!fs.existsSync(absSourcePath)) {
                            // Try process.cwd() directly
                            absSourcePath = path.resolve(process.cwd(), sourcePath);
                        }
                    }

                    if (fs.existsSync(absSourcePath)) {
                        const fileName = path.basename(absSourcePath);
                        const destPublicPath = path.join(publicAssetsDir, fileName);
                        fs.copyFileSync(absSourcePath, destPublicPath);
                        frontendAssetMap[key] = `/generated-assets/${fileName}`;
                    } else {
                        console.warn(`[Generate Action] Asset not found: ${absSourcePath}`);
                    }
                }
            }

            // 2. Write Code File
            const filePath = path.join(process.cwd(), "app", "generated", "game-slot.tsx");

            // Inject Asset Map if needed, similar to test logic
            let finalCode = result.reactCode;
            const assetMapString = JSON.stringify(frontendAssetMap, null, 2);
            const r = /export const ASSET_MAP = \{[\s\S]*?\};/m;
            if (r.test(finalCode)) {
                finalCode = finalCode.replace(r, `export const ASSET_MAP = ${assetMapString};`);
            } else {
                finalCode += `\n\nexport const ASSET_MAP = ${assetMapString};\n`;
            }

            const fileContent = `
"use client";
import React, { useState, useEffect, useRef } from "react";
import { LucideIcon, Heart, Star, Sparkles, Zap, Ghost } from "lucide-react";

${finalCode}
`;
            console.log("Writing generated code to:", filePath);
            fs.writeFileSync(filePath, fileContent);

            // 3. Seed Database (Convex)
            console.log("Seeding Convex DB with Initial State...");
            await fetchMutation(api.games.reset, {
                initialState: result.initialState as any,
                rules: (result.rules as string) || "Standard Rules"
            });

            // 4. Revalidate
            revalidatePath("/");

            return { success: true };
        } else {
            console.error("No reactCode returned from graph execution.");
        }
    } catch (error) {
        console.error("Error in generateGameAction:", error);
    }
    return { success: false };
}
