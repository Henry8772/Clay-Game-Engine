import { GoogleGenerativeAI } from "@google/generative-ai";
import { PartialJSONProcessor } from "./parser";

export interface LLMBackend {
    streamJson<T>(
        system: string,
        inputData: string | any[],
        model: string,
        schema?: any // Zod schema or similar, used more for type inference in caller usually
    ): AsyncGenerator<T, void, unknown>;
}

export class GeminiBackend implements LLMBackend {
    private client: GoogleGenerativeAI;

    constructor(apiKey: string) {
        this.client = new GoogleGenerativeAI(apiKey);
    }

    async *streamJson<T>(
        system: string,
        inputData: string | any[],
        modelName: string,
        schema?: any
    ): AsyncGenerator<T, void, unknown> {
        const model = this.client.getGenerativeModel({
            model: modelName,
            systemInstruction: system,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema
            },
        });

        const processor = new PartialJSONProcessor();
        let contents: any[] = [];

        if (typeof inputData === "string") {
            contents.push({ role: "user", parts: [{ text: inputData }] });
        } else {
            // Convert OpenAI style [{role, content}] to Gemini style [{role, parts:[{text}]}]
            contents = inputData.map((msg: any) => {
                let role = msg.role;
                if (role === 'assistant') role = 'model';
                if (role === 'system') return null; // System handled in config
                return {
                    role: role,
                    parts: [{ text: msg.content }]
                };
            }).filter(x => x !== null);
        }

        const result = await model.generateContentStream({ contents });

        for await (const chunk of result.stream) {
            const delta = chunk.text();
            if (delta) {
                const partial = processor.process(delta);
                if (partial && Object.keys(partial).length > 0) {
                    yield partial as T;
                }
            }
        }
    }
}
