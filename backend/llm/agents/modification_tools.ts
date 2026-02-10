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
        description: "Spawns an instance of an existing entity blueprint. Does NOT generate new images.",
        parameters: z.object({
            name: z.string().describe("Name of the entity"),
            description: z.string().describe("Visual description for image generation"),
            type: z.enum(["unit", "prop", "item"]).describe("Type of entity"),
            team: z.enum(["player", "enemy", "neutral"]).describe("Team affiliation"),
            count: z.number().optional().describe("How many to spawn")
        }),
    },
    {
        name: "trigger_regeneration",
        description: "Triggers a complete regeneration of the game. Use this if the user wants to change the entire premise.",
        parameters: z.object({
            newPrompt: z.string().describe("The new game prompt"),
        }),
    },
    {
        name: "update_global_sprite_style",
        description: "Changes the art style of ALL units and items at once while preserving their game identity and position.",
        parameters: z.object({
            styleDescription: z.string().describe("The visual style description (e.g. '8-bit pixel art', 'Watercolor painting')"),
        }),
    },
    {
        name: "modify_environment",
        description: "Updates the game background visuals and re-calculates the navigation mesh logic based on natural language instructions.",
        parameters: z.object({
            environment_description: z.string().describe("Prompt for the image editor"),
            logic_instruction: z.string().describe("Context for the NavMesh agent to understand the new terrain"),
        }),
    }
];

// Helper to format tools for the LLM Client
export const FORMATTED_MOD_TOOLS = MODIFICATION_TOOLS_DEF.map(tool => {
    return `${tool.name}(${Object.keys(tool.parameters.shape).join(", ")}) - ${tool.description}`;
});
