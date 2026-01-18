import { z } from "zod";

export const GameStateSchema = z.object({
    name: z.string().describe("The name of the state variable"),
    description: z.string().describe("Description of what this state represents"),
    type: z.enum(["integer", "string", "boolean", "object", "array"]).describe("Data type of the state"),
    initialValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).describe("Initial value of the state"),
});

export type GameState = z.infer<typeof GameStateSchema>;

export const GameStateListSchema = z.object({
    states: z.array(GameStateSchema),
});

export type GameStateList = z.infer<typeof GameStateListSchema>;
