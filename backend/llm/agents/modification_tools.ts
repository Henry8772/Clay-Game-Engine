import { z } from "zod";

// 1. Tool Definitions for the LLM
export const MODIFICATION_TOOLS_DEF = [
    {
        name: "generate_background",
        description: "Generates a new background image for the game scene based on a description.",
        parameters: z.object({
            description: z.string().describe("Visual description of the background (e.g. 'a dark lava cave')"),
        }),
    },
    {
        name: "spawn_entity",
        description: "Creates and spawns a new entity/enemy into the game.",
        parameters: z.object({
            name: z.string().describe("Name of the entity"),
            description: z.string().describe("Visual description for image generation"),
            type: z.enum(["unit", "prop", "item"]).describe("Type of entity"),
            team: z.enum(["player", "enemy", "neutral"]).describe("Team affiliation"),
            count: z.number().optional().describe("How many to spawn")
        }),
    },
    {
        name: "update_visual_style",
        description: "Updates the visual style (image) of existing entities matching a criteria.",
        parameters: z.object({
            targetName: z.string().describe("The name/label of entities to change (e.g. 'Goblin')"),
            newStyleDescription: z.string().describe("Description of the new look (e.g. 'Cyberpunk style goblin')"),
        }),
    },
    {
        name: "trigger_regeneration",
        description: "Triggers a complete regeneration of the game. Use this if the user wants to change the entire premise.",
        parameters: z.object({
            newPrompt: z.string().describe("The new game prompt"),
        }),
    }
];

// Helper to format tools for the LLM Client
export const FORMATTED_MOD_TOOLS = MODIFICATION_TOOLS_DEF.map(tool => {
    return `${tool.name}(${Object.keys(tool.parameters.shape).join(", ")}) - ${tool.description}`;
});
