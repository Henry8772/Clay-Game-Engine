import { LLMClient } from "../client";
import { UniversalState, Entity } from "./universal_state_types";
import { MODIFICATION_TOOLS_DEF } from "./modification_tools";
import { saveAsset } from "../../utils/paths";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { runExtractionAgent } from "./extraction_agent";
import { createTransparencyMask } from "../utils/image_processor";

export async function processModification(
    client: LLMClient,
    runId: string,
    currentState: UniversalState,
    userRequest: string
): Promise<{ newState: UniversalState; message: string; shouldRegenerate?: boolean; newPrompt?: string }> {

    console.log(`[ModificationAgent] Processing request: ${runId}, ${currentState}, ${userRequest}`);
    // 1. Define Schema for Structured Output
    const toolSchema = {
        description: "Tool selection response",
        type: "OBJECT",
        properties: {
            tool: {
                type: "STRING",
                description: "The name of the tool to call",
                enum: MODIFICATION_TOOLS_DEF.map(t => t.name)
            },
            args: {
                type: "OBJECT",
                description: "Arguments for the tool",
                properties: {
                    description: { type: "STRING", description: "Visual description of the subject" },
                    name: { type: "STRING", description: "Name/Label of the entity" },
                    type: { type: "STRING", enum: ["unit", "prop", "item"], description: "Type of entity" },
                    team: { type: "STRING", enum: ["player", "enemy", "neutral"], description: "Team affiliation from context" },
                    count: { type: "NUMBER", description: "Number of entities to spawn. Default to 1." },
                    targetName: { type: "STRING", description: "Name of target entities to modify" },
                    newStyleDescription: { type: "STRING", description: "New visual description for update" },
                    newPrompt: { type: "STRING", description: "New game prompt for regeneration" },
                    styleDescription: { type: "STRING", description: "Global style description" }
                }
            }
        },
        required: ["tool", "args"]
    };

    // 2. Ask LLM
    const systemPrompt = `
    You are a Game Master with God Mode access. 
    You can modify the game state directly based on user requests.
    Current Game Context: ${currentState.meta?.vars ? JSON.stringify(currentState.meta.vars) : "No context vars"}
    
    Tools Available:
    ${MODIFICATION_TOOLS_DEF.map(t => `- ${t.name}: ${t.description}`).join('\n')}
    `;

    const inputData = [{ role: 'user', content: `${userRequest}\n\n[Context] Game Entities Count: ${Object.keys(currentState.entities).length}` }];

    const response = await client.generateJSON<{ tool: string; args: any }>(
        systemPrompt,
        inputData,
        toolSchema,
        "modification_agent"
    );

    const { tool, args } = response;

    console.log(`[ModificationAgent] Tool: ${tool}`, args);

    let message = "Modification complete.";
    let shouldRegenerate = false;
    let newPrompt = "";

    // Helper to resolve asset paths from state URLs/Paths to disk paths
    const getDiskPath = (assetUrl: string) => {
        // Remove API proxy prefix if present to get relative filename
        const cleanName = assetUrl.split('/').pop() || assetUrl;
        return path.join(process.cwd(), 'backend', 'data', 'runs', runId, cleanName);
    };

    // 3. Execute Tool Logic
    switch (tool) {
        case "generate_background": {
            console.log(`[ModAgent] Generating background: ${args.description}`);
            const currentBg = (currentState.meta as any).vars?.background;
            let newBgBuffer: Buffer;

            console.log(`[ModAgent] Current background: ${currentBg}`);

            if (currentBg) {
                try {
                    // [Strategy: EditImage] Use current background as reference to preserve layout
                    const bgPath = getDiskPath(currentBg);
                    const bgBuffer = await fs.readFile(bgPath);
                    console.log(`[ModAgent] Editing existing background: ${bgPath}`);

                    // Instruction to preserve layout while changing style/content
                    const editPrompt = `Edit this game background. ${args.description}. Maintain the exact layout, perspective.`;

                    newBgBuffer = await client.editImage(editPrompt, bgBuffer, "gemini-2.5-flash-image");
                } catch (e) {
                    console.warn(`[ModAgent] Failed to load background for editing, falling back to generation: ${e}`);
                    newBgBuffer = await client.generateImage(args.description, "gemini-2.5-flash-image", { config: { aspectRatio: "16:9" } });
                }
            } else {
                // Fallback to Generation
                newBgBuffer = await client.generateImage(args.description, "gemini-2.5-flash-image", { config: { aspectRatio: "16:9" } });
            }

            const filename = `bg_${Date.now()}.png`;
            const assetPath = await saveAsset(runId, newBgBuffer, filename);

            // Update State
            if (!currentState.meta.vars) currentState.meta.vars = {};
            (currentState.meta as any).vars.background = assetPath;

            message = `Background updated to: ${args.description}`;
            break;
        }

        case "spawn_entity": {
            const count = args.count || 1;
            const desc = args.description || args.name;
            let assetPath: string;

            // [Strategy: EditImage] Try to find master spritesheet to maintain style coherence
            // We look for 'sprites.png' or 'sprites_white.png' (segmented version)
            const spriteSheetName = "sprites.png";
            const spriteSheetPath = path.join(process.cwd(), 'backend', 'data', 'runs', runId, spriteSheetName);

            let spriteBuffer: Buffer;

            try {
                const sheetBuffer = await fs.readFile(spriteSheetPath);
                console.log(`[ModAgent] Using master spritesheet as style reference.`);

                // We ask the model to add the new entity to the sheet or use the sheet as style ref
                // "Add a [Entity] to this sprite sheet" might return a full sheet.
                // For this agent which spawns *instances*, we ideally want an isolated sprite.
                // We'll treat the sheet as a visual reference for the edit/generation.
                const editPrompt = `Create a new sprite of ${desc}. Match the art style, line weight, and perspective of the provided reference sprites exactly. Output on a white background.`;

                spriteBuffer = await client.editImage(editPrompt, sheetBuffer, "gemini-2.5-flash-image");
            } catch (e) {
                console.log(`[ModAgent] No master spritesheet found (${e}), generating from scratch.`);
                spriteBuffer = await client.generateImage(`Sprite of ${desc}, isolated on white background`, "gemini-2.5-flash-image");
            }

            const filename = `spawn_${Date.now()}.png`;
            assetPath = await saveAsset(runId, spriteBuffer, filename);

            for (let i = 0; i < count; i++) {
                const newId = `ent_${Date.now()}_${i}`;

                // Add to State
                currentState.entities[newId] = {
                    t: "generated_spawn",
                    id: newId,
                    label: args.name,
                    type: args.type,
                    team: args.team === "player" ? "blue" : (args.team === "enemy" ? "red" : "neutral"),
                    src: assetPath,
                    // Place them near center or use navmesh logic if available (simplified here)
                    pixel_box: [350 + (i * 20), 450 + (i * 20), 450 + (i * 20), 550 + (i * 20)],
                    location: "tile_r2_c2",
                    loc: "board",
                    owner: "ai",
                    props: {}
                } as any;
            }
            message = `Spawned ${count} x ${args.name}`;
            break;
        }

        case "update_visual_style": {
            // Find matching entities
            const entities = Object.values(currentState.entities || {});
            const targets = entities.filter((e: any) => e.label && e.label.toLowerCase().includes(args.targetName.toLowerCase()));

            if (targets.length > 0) {
                // Take the source image of the first target as the base to edit
                const firstTarget = targets[0] as any;
                let newStyleBuffer: Buffer;

                try {
                    const srcPath = getDiskPath(firstTarget.src);
                    const sourceBuffer = await fs.readFile(srcPath);
                    console.log(`[ModAgent] updating style based on: ${srcPath}`);

                    const editPrompt = `Redraw this sprite as: ${args.newStyleDescription}. Maintain the same pose and size.`;
                    newStyleBuffer = await client.editImage(editPrompt, sourceBuffer, "gemini-2.5-flash-image");

                } catch (e) {
                    // Fallback if file missing
                    newStyleBuffer = await client.generateImage(`${args.newStyleDescription}, isolated on white background`, "gemini-2.5-flash-image");
                }

                const filename = `restyle_${Date.now()}.png`;
                const assetPath = await saveAsset(runId, newStyleBuffer, filename);

                targets.forEach((e: Entity) => {
                    (e as any).src = assetPath;
                    if (currentState.blueprints && currentState.blueprints[e.t]) {
                        (currentState.blueprints[e.t] as any).src = assetPath;
                    }
                });
                message = `Updated visual style for ${targets.length} entities.`;
            } else {
                message = `No entities found matching '${args.targetName}'.`;
            }
            break;
        }

        case "trigger_regeneration": {
            shouldRegenerate = true;
            newPrompt = args.newPrompt;
            message = "Regenerating game...";
            break;
        }

        case "update_global_sprite_style": {
            const style = args.styleDescription;
            console.log(`[ModAgent] Global style update to: ${style}`);

            // 1. Locate Resources
            // Try white version first, then normal
            let spritePath = path.join(process.cwd(), 'backend', 'data', 'runs', runId, 'sprites_white.png');
            try {
                await fs.access(spritePath);
            } catch {
                spritePath = path.join(process.cwd(), 'backend', 'data', 'runs', runId, 'sprites.png');
            }

            const analysisPath = path.join(process.cwd(), 'backend', 'data', 'runs', runId, 'analysis.json');

            try {
                // Check if files exist
                await fs.access(spritePath);
                await fs.access(analysisPath);

                const spriteBuffer = await fs.readFile(spritePath);
                const analysisData = JSON.parse(await fs.readFile(analysisPath, 'utf-8'));
                // Determine if analysisData is the raw array or wrapped
                const boundingBoxes = Array.isArray(analysisData) ? analysisData : (analysisData.boxes || analysisData.items || []);

                if (!boundingBoxes || boundingBoxes.length === 0) {
                    throw new Error("No bounding boxes found in analysis.json");
                }

                // 2. AI Generation (Repaint)
                console.log(`[ModAgent] Repainting spritesheet (Phase 1: White BG)...`);
                const repaintPrompt = `Redraw this sprite sheet in the style of: ${style}. Maintain the exact position, scale, and silhouette of every element. Do not add or remove objects. Keep the white background.`;

                const newSheetBufferWhite = await client.editImage(repaintPrompt, spriteBuffer, "gemini-2.5-flash-image");

                console.log(`[ModAgent] Repainting spritesheet (Phase 2: Black BG for Alpha)...`);
                // We use the NEW white buffer as input to ensure alignment, asking for black background
                const alphaPrompt = `Redraw this sprite sheet in the style of: ${style}. Maintain the exact position, scale, and silhouette of every element. Do not add or remove objects. Use a solid black background.`;
                // Use temperature 0 for consistency if possible, though editImage params might be limited
                const newSheetBufferBlack = await client.editImage(alphaPrompt, newSheetBufferWhite, "gemini-2.5-flash-image");

                console.log(`[ModAgent] Computing transparency mask...`);

                const newSheetBufferTransparent = await createTransparencyMask(newSheetBufferWhite, newSheetBufferBlack);

                // Save all assets
                const timestamp = Date.now();
                const whiteName = `sprites_restyle_white_${timestamp}.png`;
                const blackName = `sprites_restyle_black_${timestamp}.png`;
                const finalName = `sprites_restyle_${timestamp}.png`;

                await saveAsset(runId, newSheetBufferWhite, whiteName);
                await saveAsset(runId, newSheetBufferBlack, blackName);
                await saveAsset(runId, newSheetBufferTransparent, finalName);

                // --- Generate Debug Segmentation Image ---
                try {
                    const meta = await sharp(newSheetBufferTransparent).metadata();
                    const w = meta.width!;
                    const h = meta.height!;
                    const pad = 30; // Match the padding used in runExtractionAgent

                    const svgRects = boundingBoxes.map((item: any) => {
                        // Normalize coords (0-1000) to pixels
                        const box = Array.isArray(item.box_2d) ? item.box_2d : item.box_2d;
                        const [ymin, xmin, ymax, xmax] = box;

                        let top = Math.floor((ymin / 1000) * h);
                        let left = Math.floor((xmin / 1000) * w);
                        let bottom = Math.ceil((ymax / 1000) * h);
                        let right = Math.ceil((xmax / 1000) * w);

                        // Apply Padding (Smart Extraction Logic)
                        top = Math.max(0, top - pad);
                        left = Math.max(0, left - pad);
                        bottom = Math.min(h, bottom + pad);
                        right = Math.min(w, right + pad);

                        const width = right - left;
                        const height = bottom - top;

                        // Green box for search area, stroke width 2
                        return `<rect x="${left}" y="${top}" width="${width}" height="${height}" fill="none" stroke="#00FF00" stroke-width="2" />`;
                    }).join('\n');

                    const svg = `
                    <svg width="${w}" height="${h}">
                        ${svgRects}
                    </svg>
                    `;

                    const segmentedBuffer = await sharp(newSheetBufferTransparent)
                        .composite([{ input: Buffer.from(svg) }])
                        .png()
                        .toBuffer();

                    const segmentedName = `sprites_restyle_segmented_${timestamp}.png`;
                    await saveAsset(runId, segmentedBuffer, segmentedName);
                    console.log(`[ModAgent] Saved segmentation debug image: ${segmentedName}`);

                } catch (err) {
                    console.warn(`[ModAgent] Failed to generate debug segmentation image:`, err);
                }
                // -----------------------------------------


                // 3. Re-Extraction
                const outputDirName = `extracted_restyle_${timestamp}`;
                const outputDir = path.join(process.cwd(), 'backend', 'data', 'runs', runId, outputDirName);

                console.log(`[ModAgent] Extracting to ${outputDir}...`);
                const manifest = await runExtractionAgent(newSheetBufferTransparent, boundingBoxes, outputDir, { useSmartExtraction: true, padding: 30 });

                // 4. State Patching
                let updatedCount = 0;

                function normalizeLabel(l: string) {
                    return l.toLowerCase().replace(/[^a-z0-9]/g, '_');
                }

                // Update Entities
                for (const entityId in currentState.entities) {
                    const entity = currentState.entities[entityId];
                    const label = (entity as any).label;
                    if (label) {
                        const normLabel = normalizeLabel(label);
                        const matchKey = manifest[label] ? label : (manifest[normLabel] ? normLabel : null);

                        if (matchKey) {
                            const filename = path.basename(manifest[matchKey]);
                            const newRelativePath = `${outputDirName}/${filename}`;
                            (entity as any).src = newRelativePath;
                            updatedCount++;
                        }
                    }
                }

                // Update Blueprints
                if (currentState.blueprints) {
                    for (const bpName in currentState.blueprints) {
                        const bp = currentState.blueprints[bpName];
                        const label = (bp as any).label;
                        if (label) {
                            const normLabel = normalizeLabel(label);
                            const matchKey = manifest[label] ? label : (manifest[normLabel] ? normLabel : null);
                            if (matchKey) {
                                const filename = path.basename(manifest[matchKey]);
                                const newRelativePath = `${outputDirName}/${filename}`;
                                (bp as any).src = newRelativePath;
                                updatedCount++;
                            }
                        }
                    }
                }

                message = `Global style updated to '${style}'. Modified ${updatedCount} entities.`;

            } catch (e: any) {
                console.error("[ModAgent] Global style update failed:", e);
                message = `Failed to update global style: ${e.message}`;
            }
            break;
        }

        default:
            message = "I couldn't understand how to modify the game for that request.";
    }

    return { newState: currentState, message, shouldRegenerate, newPrompt };
}