import { LLMBackend, GeminiBackend } from "./backend";
import { config } from "dotenv";

config();

export class LLMClient {
    private backend: LLMBackend;
    private debugMode: boolean;
    private model: string;

    constructor(
        manufacturer: "gemini" = "gemini",
        model?: string,
        debugMode: boolean = true
    ) {
        this.debugMode = debugMode;
        this.model = model || process.env.DEFAULT_LLM_MODEL || "gemini-2.5-flash";

        if (manufacturer === "gemini") {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) throw new Error("GEMINI_API_KEY not found");
            this.backend = new GeminiBackend(apiKey);
        } else {
            throw new Error(`Unsupported manufacturer: ${manufacturer}`);
        }

        console.log(
            `LLMClient Initialized | Backend: ${manufacturer} | Model: ${this.model} | Debug: ${this.debugMode}`
        );
    }

    // TODO: Add mocks integration
    private async tryGetMock(label: string): Promise<any | null> {
        if (!this.debugMode) return null;

        // Lazy load mocks to avoid circular dependencies if possible, or just standard import
        // For simplicity, assuming imports are available at top or we import here using require/import()
        // But TS synchronous requires top level.
        // We will add imports to the top of file in a separate step or just hardcode for now for "llm unit" if needed.
        // Actually, let's use the explicit imports.

        switch (label) {
            case "planner_agent":
                // We need to return structure matching PlannerSchema
                return { designDoc: "# Game Design Doc (Mock)" };
            case "architect_agent":
                return { initialState: { mock: true }, rules: "Mock Rules" };
            case "artist_agent":
                return { imagePrompt: "Mock Prompt", visualLayout: ["mock_item"] };
            case "mapper_agent":
                return { finalState: { mock: "final" }, assetMap: { "item": "path.png" } };
            case "renderer_agent":
                return { reactCode: "export const Game = () => <div />;" };
            case "game_state_extraction":
                return { states: [] };
            default:
                return null;
        }
    }

    private async *trackTtfb<T>(
        generator: AsyncGenerator<T, void, unknown>,
        label: string
    ): AsyncGenerator<T, void, unknown> {
        const startTime = performance.now();
        let isFirstChunk = true;

        for await (const item of generator) {
            if (isFirstChunk) {
                const elapsed = performance.now() - startTime;
                console.log(`⏱️  [${label}] TTFB: ${elapsed.toFixed(2)}ms`);
                isFirstChunk = false;
            }
            yield item;
        }
    }

    public async *streamJson<T>(
        system: string,
        inputData: any,
        schema?: any,
        label: string = "llm_stream_json",
        mockResponse?: any
    ): AsyncGenerator<T, void, unknown> {
        // 1. Mock Check
        let dataToMock = null;
        if (this.debugMode) {
            if (mockResponse) {
                dataToMock = mockResponse;
                console.log(`DEBUG: Using direct mock response for '${label}'`);
            } else {
                dataToMock = await this.tryGetMock(label);
            }
        }

        if (dataToMock) {
            // In TS, validation is harder without runtime checks like Pydantic. 
            // We assume mock is valid or schema (Zod) validates it.
            // For now, yield directly.
            yield dataToMock as T;
            return;
        }

        // 2. Live Call
        const stream = this.backend.streamJson<T>(system, inputData, this.model, schema);

        for await (const item of this.trackTtfb(stream, label)) {
            yield item;
        }
    }

    public async generateImage(prompt: string, model: string = "gemini-2.5-flash-image"): Promise<Buffer> {
        if (this.debugMode) {
            console.log(`DEBUG: Generating mock image for prompt: ${prompt}`);
            // Return a simple 1x1 pixel PNG (base64) as mock
            const mockPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
            return Buffer.from(mockPng, 'base64');
        }
        return this.backend.generateImage(prompt, model);
    }

    public async editImage(prompt: string, image: Buffer, model: string = "gemini-2.5-flash-image"): Promise<Buffer> {
        if (this.debugMode) {
            console.log(`DEBUG: Editing mock image for prompt: ${prompt}`);
            const mockPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
            return Buffer.from(mockPng, 'base64');
        }
        return this.backend.editImage(prompt, image, model);
    }
}
