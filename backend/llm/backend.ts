import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";
import mime from "mime";
import { PartialJSONProcessor } from "./parser";

export interface LLMBackend {
    streamJson<T>(
        system: string,
        inputData: string | any[],
        model: string,
        schema?: any, // Zod schema or similar, used more for type inference in caller usually
        config?: any  // GenerationConfig
    ): AsyncGenerator<T, void, unknown>;

    generateContent(
        prompt: string | any[],
        model: string,
        options?: {
            systemInstruction?: string;
            config?: any; // GenerationConfig
        }
    ): Promise<string>;

    generateJSON<T>(
        system: string,
        inputData: string | any[],
        model: string,
        schema?: any,
        config?: any
    ): Promise<T>;

    generateImage(
        prompt: string,
        model: string,
        options?: { imageConfig?: any, config?: any }
    ): Promise<Buffer>;

    editImage(
        prompt: string,
        image: Buffer | Buffer[],
        model: string,
        options?: { imageConfig?: any, config?: any }
    ): Promise<Buffer>;

    segmentImage(
        image: Buffer,
        labels: string[],
        model: string
    ): Promise<any[]>;
}

export class GeminiBackend implements LLMBackend {
    private client: GoogleGenerativeAI;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.client = new GoogleGenerativeAI(apiKey);
    }

    async *streamJson<T>(
        system: string,
        inputData: string | any[],
        modelName: string,
        schema?: any,
        config?: any
    ): AsyncGenerator<T, void, unknown> {
        const generationConfig: any = {
            responseMimeType: "application/json",
            responseSchema: schema
        };

        if (config) {
            Object.assign(generationConfig, config);
        }

        const model = this.client.getGenerativeModel({
            model: modelName,
            systemInstruction: system,
            generationConfig: generationConfig,
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

    async generateJSON<T>(
        system: string,
        inputData: string | any[],
        modelName: string,
        schema?: any,
        config?: any
    ): Promise<T> {
        const generationConfig: any = {
            responseMimeType: "application/json",
            responseSchema: schema
        };

        if (config) {
            Object.assign(generationConfig, config);
        }

        const model = this.client.getGenerativeModel({
            model: modelName,
            systemInstruction: system,
            generationConfig: generationConfig,
        });

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

        const result = await model.generateContent({ contents });
        const response = result.response;
        const text = response.text();

        try {
            return JSON.parse(text) as T;
        } catch (e) {
            console.error("Failed to parse JSON from backend:", text);
            throw new Error("Backend response was not valid JSON");
        }
    }

    async generateContent(
        prompt: string | any[],
        modelName: string,
        options?: {
            systemInstruction?: string;
            config?: any;
        }
    ): Promise<string> {
        const generationConfig: any = {};
        if (options?.config) {
            Object.assign(generationConfig, options.config);
        }

        const model = this.client.getGenerativeModel({
            model: modelName,
            systemInstruction: options?.systemInstruction,
            generationConfig: generationConfig,
        });

        let contents: any[] = [];
        if (typeof prompt === "string") {
            contents = [{ role: "user", parts: [{ text: prompt }] }];
        } else {
            // Assume prompt is already in the correct format or is an array of parts
            // Checks if it is already in [{role, parts}] format
            if (Array.isArray(prompt) && prompt.length > 0 && prompt[0].role) {
                contents = prompt;
            } else {
                // Assume it's just parts for a single user message if it's not the full conversation
                contents = [{ role: "user", parts: prompt }];
            }
        }

        const result = await model.generateContent({ contents });
        const response = result.response;
        return response.text();
    }

    async generateImage(prompt: string, modelName: string, options?: { imageConfig?: any, config?: any }): Promise<Buffer> {
        const ai = new GoogleGenAI({ apiKey: this.apiKey });

        const config: any = {
            responseModalities: ['IMAGE'],
        };

        if (options?.imageConfig) {
            config.imageConfig = options.imageConfig;
        }

        if (options?.config) {
            Object.assign(config, options.config);
        }

        console.log(`[GeminiBackend] generateImage (new SDK) config: ${JSON.stringify(config)}`);

        // Using the new SDK structure
        const response = await ai.models.generateContent({
            model: modelName,
            config: config,
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }]
        });

        const candidates = response.candidates;
        if (candidates && candidates[0]?.content?.parts) {
            for (const part of candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return Buffer.from(part.inlineData.data, 'base64');
                }
            }
        }

        throw new Error("No image data found in response");
    }

    async editImage(prompt: string, images: Buffer | Buffer[], modelName: string, options?: { imageConfig?: any, config?: any }): Promise<Buffer> {
        const ai = new GoogleGenAI({ apiKey: this.apiKey });

        const imageBuffers = Array.isArray(images) ? images : [images];
        const parts: any[] = [{ text: prompt }];

        for (const img of imageBuffers) {
            parts.push({
                inlineData: {
                    data: img.toString('base64'),
                    mimeType: "image/png"
                }
            });
        }

        const config: any = {
            responseModalities: ['IMAGE'],
        };

        if (options?.imageConfig) {
            config.imageConfig = options.imageConfig;
        }

        if (options?.config) {
            Object.assign(config, options.config);
        }

        console.log(`[GeminiBackend] editImage (new SDK) config: ${JSON.stringify(config)}`);

        const response = await ai.models.generateContent({
            model: modelName,
            config: config,
            contents: [{
                role: 'user',
                parts: parts
            }]
        });

        const candidates = response.candidates;
        if (candidates && candidates[0]?.content?.parts) {
            for (const part of candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return Buffer.from(part.inlineData.data, 'base64');
                }
            }
        }

        console.error("Gemini Generation Failed. Response:", JSON.stringify(response, null, 2));
        throw new Error("No image data found in response. Check logs for safety filters or other issues.");
    }

    async segmentImage(image: Buffer, labels: string[], modelName: string = "gemini-2.0-flash"): Promise<any[]> {
        const model = this.client.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
            Detect the following objects in the image: ${labels.join(", ")}.
            Return a list of detected objects with their bounding boxes.
            
            Output strictly valid JSON in this format:
            [
              {
                "label": "string",
                "box2d": [ymin, xmin, ymax, xmax] 
              }
            ]
            
            Where ymin, xmin, ymax, xmax are normalized coordinates (0-1000).
            If an object is not found, do not include it.
        `;

        const imagePart = {
            inlineData: {
                data: image.toString('base64'),
                mimeType: "image/png" // Assuming PNG based on previous contexts
            }
        };

        try {
            const result = await model.generateContent([prompt, imagePart]);
            const response = result.response;
            const text = response.text();

            return JSON.parse(text);
        } catch (error) {
            console.error("Gemini segmentation failed:", error);
            console.warn("⚠️ Fallback: returning empty regions due to error.");
            return [];
        }
    }
}
