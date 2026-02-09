import { LLMClient } from "../client";
import { UniversalState, Entity } from "./universal_state_types";
import { MODIFICATION_TOOLS_DEF, FORMATTED_MOD_TOOLS } from "./modification_tools"; import { saveAsset } from "../../utils/paths";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { runExtractionAgent } from "./extraction_agent";
import { createTransparencyMask, drawBoundingBoxes } from "../utils/image_processor";

import { runVisionAgent } from "./vision_agent";
import { runSpriteAgent } from "./sprite_agent";
import { reclassifyMap } from "./navmesh_agent";
import { GameDesign } from "./design_agent";

function buildDesignFromState(state: UniversalState): GameDesign {
    const interactables: string[] = [];
    if (state.blueprints) {
        Object.values(state.blueprints).forEach(bp => {
            if (bp.label || bp.name) interactables.push(bp.label || bp.name);
        });
    }
    return {
        art_style: (state.meta.vars as any)?.art_style || "unknown",
        perspective: "unknown",
        background_theme: "unknown",
        grid_type: "unknown",
        player_team: [],
        enemy_team: [],
        interactable_objects: interactables,
        obstacles: [],
        ui_elements: [],
        rules_summary: "",
        game_loop_mechanics: ""
    };
}


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
                    styleDescription: { type: "STRING", description: "Global style description" },
                    visual_instruction: {
                        type: "STRING",
                        description: "A short, plain English command (e.g. 'Turn lava to ice'). Do NOT include style keywords, resolutions, or lists."
                    },
                    logic_instruction: {
                        type: "STRING",
                        description: "A short logic summary (e.g. 'Lava is now safe floor')."
                    }
                }
            }
        },
        required: ["tool", "args"]
    };

    // 2. Ask LLM
    const systemPrompt = `
    You are a Game Master with God Mode access. 
    You can modify the game state directly based on user requests.
    
    Tools Available:
    ${FORMATTED_MOD_TOOLS.join('\n')}

    INSTRUCTIONS:
    1. Select the most appropriate tool to handle the user's request.
    2. Must be 1 sentence for each function argument.

    EXAMPLES:
    User: "Make it look like night time"
    Output: {"tool":"modify_environment","args":{"visual_instruction":"Change lighting to dark night.","logic_instruction":"No logic change."}}

    User: "Freeze the lava"
    Output: {"tool":"modify_environment","args":{"visual_instruction":"Turn liquid lava into solid blue ice.","logic_instruction":"Lava tiles are now traversable floor."}}

    User: "Add a goblin"
    Output: {"tool":"spawn_entity","args":{"name":"Goblin","count":1}}
    
    JSON OUTPUT`;

    const inputData = [{ role: 'user', content: `${userRequest}\n\n[Context] Game Entities Count: ${Object.keys(currentState.entities).length}` }];

    console.log(`[ModificationAgent] systemPrompt: ${systemPrompt}`);
    console.log(`[ModificationAgent] inputData: ${JSON.stringify(inputData)}`);

    let tool: string | undefined;
    let args: any;



    // If tool was not assigned by Demo Mode (e.g. Puzzle Step 2, or not in Demo Mode), call LLM
    if (!tool || !args) {
        // Normal LLM Call
        const response = await client.generateJSON<{ tool: string; args: any }>(
            systemPrompt,
            inputData,
            toolSchema,
            "modification_agent",
            undefined,
            {
                temperature: 0.2,
                maxOutputTokens: 1024,
                timeout: 30000
            }
        );
        tool = response.tool;
        args = response.args;
    }

    console.log(`[ModificationAgent] Tool: ${tool}`, args);

    // debug 
    // const tool = "update_global_sprite_style";
    // const args = { styleDescription: "cyberpunk" };

    console.log(`[ModificationAgent] Tool: ${tool}`, args);

    // Build design context for agents
    const designContext = buildDesignFromState(currentState);

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

        case "spawn_entity":
            {
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

                const orcLocations = ['tile_r3_c1', 'tile_r3_c0', 'tile_r5_c3'];

                for (let i = 0; i < count; i++) {
                    const newId = `ent_${Date.now()}_${i}`;

                    // Determine location
                    let spawnLoc = "tile_r2_c2";
                    if (runId === 'boardgame' && args.name === 'Orc' && i < orcLocations.length) {
                    }

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
                        location: spawnLoc,
                        loc: "board",
                        owner: "ai",
                        props: {}
                    } as any;
                }
                message = `Spawned ${count} x ${args.name}`;
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

            // 1. Locate Resources (Use White version if available for cleaner input)
            let spritePath = path.join(process.cwd(), 'backend', 'data', 'runs', runId, 'sprites_white.png');
            try {
                await fs.access(spritePath);
            } catch {
                spritePath = path.join(process.cwd(), 'backend', 'data', 'runs', runId, 'sprites.png');
            }

            const inputBuffer = await fs.readFile(spritePath);

            // 2. Run Modular Sprite Agent (Handles White -> Black -> Transparent)
            // Note: runSpriteAgent now returns the transparent buffer
            const newSheetBuffer = await runSpriteAgent(client, inputBuffer, path.join(process.cwd(), 'backend', 'data', 'runs', runId), {
                mode: 'restyle_existing',
                styleDescription: style
            }, designContext);

            // Debug code to load analysis_modified.json as newSheetBuffer
            // const newSheetBuffer = await fs.readFile(path.join(process.cwd(), 'backend', 'data', 'runs', runId, 'sprites_restyle_1770278685817.png'));

            // Save the final transparent sheet
            const timestamp = Date.now();
            const finalSheetName = `sprites_restyle_${timestamp}.png`;
            const finalSheetPath = await saveAsset(runId, newSheetBuffer, finalSheetName);

            // 3. Run Vision Agent (Uses the transparent buffer)
            console.log(`[ModAgent] Running vision agent to detect items...`);
            const detectedItems = await runVisionAgent(client, newSheetBuffer, designContext);

            // --- Generate Debug Segmentation Image ---
            try {
                const segmentedBuffer = await drawBoundingBoxes(newSheetBuffer, detectedItems);

                const segmentedName = `sprites_restyle_segmented_${timestamp}.png`;
                await saveAsset(runId, segmentedBuffer, segmentedName);
                console.log(`[ModAgent] Saved segmentation debug image: ${segmentedName}`);

            } catch (err) {
                console.warn(`[ModAgent] Failed to generate debug segmentation image:`, err);
            }

            // Debug code to load analysis_modified.json as detectedItems
            // const filePath = path.join(process.cwd(), 'backend', 'data', 'runs', runId, 'analysis_modified.json');
            // const fileContent = await fs.readFile(filePath, 'utf-8');
            // const detectedItems = JSON.parse(fileContent);

            // 4. Run Extraction Agent
            const outputDirName = `extracted_restyle_${timestamp}`;
            const outputDir = path.join(process.cwd(), 'backend', 'data', 'runs', runId, outputDirName);

            const manifest = await runExtractionAgent(newSheetBuffer, detectedItems, outputDir);

            // 5. State Patching (Mapping manifest back to State)
            let updatedCount = 0;

            // Helper to match labels loosely
            function normalizeLabel(l: string) { return l.toLowerCase().replace(/[^a-z0-9]/g, '_'); }

            // Update Entities
            for (const entityId in currentState.entities) {
                const entity = currentState.entities[entityId];
                let labelToMatch = (entity as any).label;

                if (!labelToMatch && entity.t && currentState.blueprints && currentState.blueprints[entity.t]) {
                    labelToMatch = currentState.blueprints[entity.t].label;
                }
                if (labelToMatch) {
                    const normLabel = normalizeLabel(labelToMatch);
                    // Try exact match, then normalized match
                    const matchKey = manifest[labelToMatch] ? labelToMatch : (manifest[normLabel] ? normLabel : null);

                    if (matchKey) {
                        const filename = path.basename(manifest[matchKey]);
                        (entity as any).src = `${outputDirName}/${filename}`;
                        updatedCount++;
                    }
                }
            }

            // Update Blueprints
            if (currentState.blueprints) {
                for (const bpName in currentState.blueprints) {
                    const bp = currentState.blueprints[bpName];
                    if (bpName) {
                        const matchKey = bpName.replace('tpl_', '');
                        if (matchKey) {
                            const filename = path.basename(manifest[matchKey]);
                            (bp as any).src = `${outputDirName}/${filename}`;
                            updatedCount++;
                        }
                    }
                }
            }

            message = `Global style updated to '${style}'. Updated ${updatedCount} assets.`;
            break;
        }

        case "modify_environment": {
            // const { visual_instruction, logic_instruction } = args;
            const visual_instruction = args.visual_instruction || `Update backgroundenvironment follows ${userRequest}`;
            const logic_instruction = args.logic_instruction ||
                `Modified terrain described as '${userRequest}'.`;
            console.log(`[ModAgent] Environment Update: Visual="${visual_instruction}", Logic="${logic_instruction}"`);




            // 1. Load Current Background
            const currentBgPath = (currentState.meta as any).vars?.background;
            if (!currentBgPath) throw new Error("No background found to modify");

            const bgDiskPath = getDiskPath(currentBgPath);
            const bgBuffer = await fs.readFile(bgDiskPath);

            // 2. VISUAL PHASE: Edit the Image
            // Use the user's prompt to guide the diffusion model
            const editPrompt = `Edit this game map. ${visual_instruction}. Maintain exact perspective and grid layout.`;
            const newBgBuffer = await client.editImage(editPrompt, bgBuffer, "gemini-2.5-flash-image");

            // 3. LOGIC PHASE: Re-scan NavMesh
            // Pass the new image AND the logic instruction to the NavMesh agent
            if (currentState.navMesh) {
                const rows = (currentState as any).grid?.rows || 6;
                const cols = (currentState as any).grid?.cols || 6;

                const updatedNavMesh = await reclassifyMap(
                    client,
                    newBgBuffer,
                    rows,
                    cols,
                    currentState.navMesh,
                    logic_instruction // e.g. "The frozen lava is now safe floor"
                );

                currentState.navMesh = updatedNavMesh;
            }

            // 4. Update State & Assets
            const filename = `bg_mod_${Date.now()}.png`;
            const newAssetPath = await saveAsset(runId, newBgBuffer, filename);

            // Update global variable for background
            if (!currentState.meta.vars) currentState.meta.vars = {};
            (currentState.meta as any).vars.background = newAssetPath;

            message = `Environment updated. Visuals changed and navigation logic re-calculated.`;
            break;
        }

        default:
            message = "I couldn't understand how to modify the game for that request.";
    }

    return { newState: currentState, message, shouldRegenerate, newPrompt };
}