import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { createTransparencyMask } from '../llm/utils/image_processor';

describe('MaskProcessor', () => {
    it('should correctly recover alpha and color from white and black backgrounds', async () => {
        // Create a 1x1 image with a semi-transparent color
        // Target: Red (255, 0, 0), Alpha 0.5 (~128)

        // On White (255, 255, 255):
        // R = 255 * 0.5 + 255 * (1 - 0.5) = 127.5 + 127.5 = 255
        // G = 0 * 0.5 + 255 * (1 - 0.5) = 127.5
        // B = 0 * 0.5 + 255 * (1 - 0.5) = 127.5
        const whitePixel = Buffer.from([255, 128, 128, 255]); // RGBA (Solid composite)

        // On Black (0, 0, 0):
        // R = 255 * 0.5 + 0 * (1 - 0.5) = 127.5
        // G = 0 * 0.5 + 0 * (1 - 0.5) = 0
        // B = 0 * 0.5 + 0 * (1 - 0.5) = 0
        const blackPixel = Buffer.from([128, 0, 0, 255]); // RGBA (Solid composite)

        // Create buffers using sharp
        const whiteBuffer = await sharp(whitePixel, {
            raw: { width: 1, height: 1, channels: 4 }
        }).png().toBuffer();

        const blackBuffer = await sharp(blackPixel, {
            raw: { width: 1, height: 1, channels: 4 }
        }).png().toBuffer();

        const result = await createTransparencyMask(whiteBuffer, blackBuffer);

        const resultImage = sharp(result);
        const { data } = await resultImage.raw().toBuffer({ resolveWithObject: true });

        // Expected: R=255, G=0, B=0, A~128
        const r = data[0];
        const g = data[1];
        const b = data[2];
        const a = data[3];

        console.log(`Recovered: R=${r}, G=${g}, B=${b}, A=${a}`);

        // Allow some tolerance due to integer rounding
        expect(r).toBeGreaterThanOrEqual(250);
        expect(g).toBeLessThanOrEqual(5);
        expect(b).toBeLessThanOrEqual(5);
        expect(a).toBeGreaterThanOrEqual(120);
        expect(a).toBeLessThanOrEqual(135);
    });

    it('should handle fully transparent pixels', async () => {
        // Target: Transparent
        // On White: White
        const whitePixel = Buffer.from([255, 255, 255, 255]);
        // On Black: Black
        const blackPixel = Buffer.from([0, 0, 0, 255]);

        const whiteBuffer = await sharp(whitePixel, { raw: { width: 1, height: 1, channels: 4 } }).png().toBuffer();
        const blackBuffer = await sharp(blackPixel, { raw: { width: 1, height: 1, channels: 4 } }).png().toBuffer();

        const result = await createTransparencyMask(whiteBuffer, blackBuffer);
        const { data } = await sharp(result).raw().toBuffer({ resolveWithObject: true });

        // Expected Alpha near 0
        expect(data[3]).toBeLessThan(5);
    });

    it('should handle fully opaque pixels', async () => {
        // Target: Blue Opaque
        // On White: Blue
        const whitePixel = Buffer.from([0, 0, 255, 255]);
        // On Black: Blue
        const blackPixel = Buffer.from([0, 0, 255, 255]);

        const whiteBuffer = await sharp(whitePixel, { raw: { width: 1, height: 1, channels: 4 } }).png().toBuffer();
        const blackBuffer = await sharp(blackPixel, { raw: { width: 1, height: 1, channels: 4 } }).png().toBuffer();

        const result = await createTransparencyMask(whiteBuffer, blackBuffer);
        const { data } = await sharp(result).raw().toBuffer({ resolveWithObject: true });

        // Expected Blue, Alpha 255
        expect(data[2]).toBeGreaterThan(250);
        expect(data[3]).toBeGreaterThan(250);
    });
});
