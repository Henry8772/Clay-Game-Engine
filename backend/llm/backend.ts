import { GoogleGenerativeAI } from "@google/generative-ai";
import { PartialJSONProcessor } from "./parser";

export interface LLMBackend {
    streamJson<T>(
        system: string,
        inputData: string | any[],
        model: string,
        schema?: any // Zod schema or similar, used more for type inference in caller usually
    ): AsyncGenerator<T, void, unknown>;

    generateImage(
        prompt: string,
        model: string
    ): Promise<Buffer>;

    editImage(
        prompt: string,
        image: Buffer,
        model: string
    ): Promise<Buffer>;
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

    async generateImage(prompt: string, modelName: string): Promise<Buffer> {
        const model = this.client.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = result.response;

        // Check for inlineData (image)
        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return Buffer.from(part.inlineData.data, 'base64');
                }
            }
        }

        throw new Error("No image data found in response");
    }

    async editImage(prompt: string, image: Buffer, modelName: string): Promise<Buffer> {
        const model = this.client.getGenerativeModel({ model: modelName });

        const imagePart = {
            inlineData: {
                data: image.toString('base64'),
                mimeType: "image/png" // Assuming PNG for simplicity, could be parametrized
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = result.response;

        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return Buffer.from(part.inlineData.data, 'base64');
                }
            }
        }

        throw new Error("No image data found in response");
    }
}
