
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { DetectedItem } from './vision_agent';

export interface ExtractionOptions {
    useSmartExtraction?: boolean;
    padding?: number;
}

export async function runExtractionAgent(
    spriteBuffer: Buffer,
    detectedItems: DetectedItem[],
    outputDir: string,
    options: ExtractionOptions = {}
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

        const originalTop = Math.floor((ymin / 1000) * height);
        const originalLeft = Math.floor((xmin / 1000) * width);
        const originalBottom = Math.ceil((ymax / 1000) * height);
        const originalRight = Math.ceil((xmax / 1000) * width);

        // Define region to extract
        let top = Math.max(0, originalTop);
        let left = Math.max(0, originalLeft);
        let bottom = Math.min(height, originalBottom);
        let right = Math.min(width, originalRight);

        if (options.useSmartExtraction) {
            const pad = options.padding || 20;
            top = Math.max(0, top - pad);
            left = Math.max(0, left - pad);
            bottom = Math.min(height, bottom + pad);
            right = Math.min(width, right + pad);
        }

        const extractWidth = right - left;
        const extractHeight = bottom - top;

        console.log(`[Extract] ${item.label}: [${left}, ${top}, ${right}, ${bottom}] (${extractWidth}x${extractHeight}) in ${width}x${height}`);

        if (left < 0 || top < 0 || left + extractWidth > width || top + extractHeight > height) {
            console.error(`[Extract] Bounds Error: ${item.label}: [${left}, ${top}, ${right}, ${bottom}] in ${width}x${height}`);
        }

        if (extractWidth <= 0 || extractHeight <= 0) {
            console.warn(`[ExtractionAgent] Skipping invalid box for ${item.label}`);
            continue;
        }

        // Sanitize label for filename
        const safeLabel = item.label.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${safeLabel}.png`;
        const outPath = path.join(outputDir, filename);

        try {
            // First extract to buffer to isolate potential pipeline issues
            // Ensure integers
            const eLeft = Math.round(left);
            const eTop = Math.round(top);
            const eWidth = Math.round(extractWidth);
            const eHeight = Math.round(extractHeight);

            let extractedBuffer = await sharp(spriteBuffer)
                .extract({ left: eLeft, top: eTop, width: eWidth, height: eHeight })
                .toBuffer();

            if (options.useSmartExtraction) {
                // Trim the extracted buffer
                extractedBuffer = await sharp(extractedBuffer)
                    .trim()
                    .toBuffer();
            }

            await sharp(extractedBuffer).toFile(outPath);
        } catch (e: any) {
            throw new Error(`Failed to extract ${item.label} at [${left}, ${top}, ${extractWidth}, ${extractHeight}] (smart: ${options.useSmartExtraction}) from image ${width}x${height} (${metadata.format}). Error: ${e.message}`);
        }

        manifest[item.label] = `extracted/${filename}`;
    }

    return manifest;
}
