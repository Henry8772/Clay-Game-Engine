
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { DetectedItem } from './vision_agent';

export async function runExtractionAgent(
    spriteBuffer: Buffer,
    detectedItems: DetectedItem[],
    outputDir: string
): Promise<Record<string, string>> {
    console.log("[ExtractionAgent] Extracting assets...");

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const metadata = await sharp(spriteBuffer).metadata();
    const width = metadata.width!;
    const height = metadata.height!;

    const manifest: Record<string, string> = {};

    for (const item of detectedItems) {
        const [ymin, xmin, ymax, xmax] = item.box_2d;

        const top = Math.max(0, Math.floor((ymin / 1000) * height));
        const left = Math.max(0, Math.floor((xmin / 1000) * width));
        const bottom = Math.min(height, Math.ceil((ymax / 1000) * height));
        const right = Math.min(width, Math.ceil((xmax / 1000) * width));

        const extractWidth = right - left;
        const extractHeight = bottom - top;

        if (extractWidth <= 0 || extractHeight <= 0) {
            console.warn(`[ExtractionAgent] Skipping invalid box for ${item.label}`);
            continue;
        }

        // Sanitize label for filename
        const safeLabel = item.label.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${safeLabel}.png`;
        const outPath = path.join(outputDir, filename);

        await sharp(spriteBuffer)
            .extract({ left, top, width: extractWidth, height: extractHeight })
            .toFile(outPath);

        manifest[item.label] = `extracted/${filename}`;
    }

    return manifest;
}
