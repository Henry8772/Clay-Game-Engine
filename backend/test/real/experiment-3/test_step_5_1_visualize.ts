
import { describe, it } from 'vitest';
import { config } from "dotenv";
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';

config();

describe('EXPERIMENT: Step 5.1 - Visualization', () => {
    it('should visualize navmesh on background', async () => {
        const currentDir = __dirname;
        const spritePath = path.join(currentDir, "background.png");
        const analysisPath = path.join(currentDir, "navmesh.json");

        if (!fs.existsSync(spritePath)) throw new Error("background.png not found. Run Step 1.");
        if (!fs.existsSync(analysisPath)) throw new Error("navmesh.json not found. Run Step 5.");


        const spriteBuffer = fs.readFileSync(spritePath);
        const detectedItems = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));

        console.log(`\n📂 Loaded Data: ${detectedItems.length} items to extract.`);

        const metadata = await sharp(spriteBuffer).metadata();
        const width = metadata.width!;
        const height = metadata.height!;

        console.log("\n🎨 Phase 4a: Visualization...");
        let svgContent = `<svg width="${width}" height="${height}">`;

        for (const item of detectedItems) {
            const [y_min_norm, x_min_norm, y_max_norm, x_max_norm] = item.box_2d;

            const x_min = (x_min_norm / 1000) * width;
            const x_max = (x_max_norm / 1000) * width;
            const y_min = (y_min_norm / 1000) * height;
            const y_max = (y_max_norm / 1000) * height;

            const boxWidth = x_max - x_min;
            const boxHeight = y_max - y_min;
            const color = "red";

            svgContent += `
                <rect x="${x_min}" y="${y_min}" width="${boxWidth}" height="${boxHeight}"
                      style="fill:none;stroke:${color};stroke-width:2" />
                <rect x="${x_min}" y="${y_min - 15}" width="${item.label.length * 7}" height="15"
                      style="fill:${color};opacity:0.7" />
                <text x="${x_min + 2}" y="${y_min - 3}" fill="white" font-family="Arial" font-size="10">${item.label}</text>
            `;
        }
        svgContent += `</svg>`;

        const segmentedPath = path.join(currentDir, 'navmesh_segmented.png');
        await sharp(spriteBuffer)
            .composite([{ input: Buffer.from(svgContent), blend: 'over' }])
            .toFile(segmentedPath);
        console.log(`   ✅ Saved Segmentation Visualization: ${segmentedPath}`);

    });
});
