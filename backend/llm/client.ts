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
        // Integration with mocks.ts comes later
        return null;
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
}
