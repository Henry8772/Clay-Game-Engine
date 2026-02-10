import { LLMBackend, GeminiBackend } from "./backend";
import { config } from "dotenv";

// Load .env.local first (if exists), then fall back to .env
config({ path: '.env.local' });
config();

export class LLMClient {
    private backend: LLMBackend;
    private debugMode: boolean;
    private model: string;

    constructor(
        manufacturer: "gemini" = "gemini",
        model?: string,
        debugMode?: boolean,
        apiKey?: string
    ) {
        this.debugMode = debugMode ?? (process.env.USE_MOCK_MODE === 'true');
        this.model = model || process.env.DEFAULT_LLM_MODEL || "gemini-2.5-flash";

        if (manufacturer === "gemini") {
            const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
            if (!finalApiKey) throw new Error("GEMINI_API_KEY not found (env or passed)");
            this.backend = new GeminiBackend(finalApiKey);
        } else {
            throw new Error(`Unsupported manufacturer: ${manufacturer}`);
        }
    }

    public get isDebug(): boolean {
        return this.debugMode;
    }

    // TODO: Add mocks integration
    private async tryGetMock(label: string): Promise<any | null> {
        if (!this.debugMode) return null;

        // Lazy load mocks to avoid circular dependencies if possible, or just standard import
        // Using explicit imports as intended.
        const {
            MOCK_DESIGN_DOC,
            MOCK_INITIAL_STATE,
            MOCK_RULES,
            MOCK_IMAGE_PROMPT,
            MOCK_VISUAL_LAYOUT,
            MOCK_FINAL_STATE,
            MOCK_ASSET_MAP,
            MOCK_REACT_CODE,
            MOCK_DETECTED_REGIONS,
            MOCK_RESTORED_ASSETS,
            MOCK_ENTITY_LIST,
            MOCK_BLUEPRINTS
        } = await import("./graph/mocks");
        const { mockGameStateExtraction } = await import("./agents/mocks");

        switch (label) {
            case "planner_agent":
                // We need to return structure matching PlannerSchema
                return { designDoc: MOCK_DESIGN_DOC };
            case "architect_agent":
                return {
                    initialState: JSON.stringify(MOCK_INITIAL_STATE),
                    rules: MOCK_RULES,
                    blueprints: JSON.stringify(MOCK_BLUEPRINTS)
                };
            case "artist_agent":
                return { imagePrompt: MOCK_IMAGE_PROMPT, visualLayout: MOCK_VISUAL_LAYOUT };
            case "ui_designer":
            case "ui_prompt_generator":
                return { imagePrompt: MOCK_IMAGE_PROMPT, visualLayout: MOCK_VISUAL_LAYOUT };
            case "scene_decomposer":
                return { detectedRegions: MOCK_DETECTED_REGIONS };
            case "asset_restorer":
                // Mocking a single asset restoration response
                return {
                    ...MOCK_RESTORED_ASSETS[0],
                    inpaintingPrompt: "Inpaint this asset on transparent background"
                };
            case "mapper_agent":
                return { finalState: MOCK_FINAL_STATE, assetMap: MOCK_ASSET_MAP };
            case "renderer_agent":
                return { reactCode: MOCK_REACT_CODE };
            case "game_state_extraction":
                return mockGameStateExtraction();
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

    private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
        let timeoutHandle: NodeJS.Timeout;
        const timeoutPromise = new Promise<T>((_, reject) => {
            timeoutHandle = setTimeout(() => {
                reject(new Error(`[${label}] Timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        });

        return Promise.race([promise, timeoutPromise]).finally(() => {
            clearTimeout(timeoutHandle!);
        });
    }

    public async generateJSON<T>(
        system: string,
        inputData: any,
        schema?: any,
        label: string = "llm_generate_json",
        mockResponse?: any,
        config?: any
    ): Promise<T> {
        // 1. Mock Check
        if (this.debugMode) {
            let dataToMock = null;
            if (mockResponse) {
                dataToMock = mockResponse;
            } else {
                dataToMock = await this.tryGetMock(label);
            }

            if (dataToMock) {
                return dataToMock as T;
            }
        }

        // 2. Live Call
        const startTime = performance.now();
        const { timeout: timeoutOverride, model: modelOverride, ...apiConfig } = config || {};
        const timeoutMs = timeoutOverride || 60000; // Default 60s timeout for JSON

        try {
            const result = await this.withTimeout(
                this.backend.generateJSON<T>(system, inputData, modelOverride || this.model, schema, apiConfig),
                timeoutMs,
                label
            );
            const elapsed = performance.now() - startTime;
            console.log(`⏱️  [${label}] Completed in: ${elapsed.toFixed(2)}ms`);
            return result;
        } catch (e) {
            const elapsed = performance.now() - startTime;
            console.error(`❌ [${label}] Failed after ${elapsed.toFixed(2)}ms:`, e);
            throw e;
        }
    }

    public async generateContent(
        prompt: string | any[],
        model: string = "gemini-2.5-flash",
        options?: {
            systemInstruction?: string;
            config?: any;
            label?: string; // For mocking
            timeout?: number;
        }
    ): Promise<string> {
        const label = options?.label || 'generate_content';
        if (this.debugMode) {
            console.log(`DEBUG: Generating mock content for label: ${label}`);
            return "MOCK_CONTENT";
        }

        const timeoutMs = options?.timeout || 60000; // Default 60s

        return this.withTimeout(
            this.backend.generateContent(prompt, model, options),
            timeoutMs,
            label
        );
    }

    public async generateImage(
        prompt: string,
        model: string = "gemini-2.5-flash-image",
        options?: { imageConfig?: any, config?: any, timeout?: number }
    ): Promise<Buffer> {
        if (this.debugMode) {
            console.log(`DEBUG: Generating mock image for prompt: ${prompt}`);
            // Return a simple 1x1 pixel PNG (base64) as mock
            const mockPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
            return Buffer.from(mockPng, 'base64');
        }

        const timeoutMs = options?.timeout || 60000;
        return this.withTimeout(
            this.backend.generateImage(prompt, model, options),
            timeoutMs,
            "generate_image"
        );
    }

    public async editImage(
        prompt: string,
        image: Buffer | Buffer[],
        model: string = "gemini-2.5-flash-image",
        options?: { imageConfig?: any, config?: any, timeout?: number }
    ): Promise<Buffer> {
        if (this.debugMode) {
            console.log(`DEBUG: Editing mock image for prompt: ${prompt}`);
            const mockPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
            return Buffer.from(mockPng, 'base64');
        }

        const timeoutMs = options?.timeout || 60000;
        return this.withTimeout(
            this.backend.editImage(prompt, image, model, options),
            timeoutMs,
            "edit_image"
        );
    }

    public async segmentImage(image: Buffer, labels: string[], model: string = "gemini-2.5-flash"): Promise<any[]> {
        if (this.debugMode) {
            console.log(`DEBUG: Segmenting image for labels: ${labels.join(", ")}`);
            const mockRegions = await this.tryGetMock("scene_decomposer");
            return mockRegions?.detectedRegions || [];
        }
        // Segmentation usually fast, but let's give it 30s
        return this.withTimeout(
            this.backend.segmentImage(image, labels, model),
            30000,
            "segment_image"
        );
    }
}
