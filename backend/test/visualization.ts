import sharp from 'sharp';

interface Box2DItem {
    box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
    label?: string;
}

/**
 * Overlays bounding boxes and labels on an image.
 * Returns a new image buffer.
 */
export async function drawBoundingBoxes(imageBuffer: Buffer, items: Box2DItem[]): Promise<Buffer> {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width || 1000;
    const height = metadata.height || 1000;

    const svgRects = items.map(item => {
        const [ymin, xmin, ymax, xmax] = item.box_2d;

        // Convert normalized coordinates (0-1000) to pixels
        const x = (xmin / 1000) * width;
        const y = (ymin / 1000) * height;
        const w = ((xmax - xmin) / 1000) * width;
        const h = ((ymax - ymin) / 1000) * height;

        // Random color generation based on label for distinction
        const color = stringToColor(item.label || 'unknown');

        return `
            <rect x="${x}" y="${y}" width="${w}" height="${h}" 
                  fill="none" stroke="${color}" stroke-width="2" />
            <text x="${x}" y="${y - 5}" font-family="Arial" font-size="14" fill="${color}" style="text-shadow: 1px 1px 1px black;">
                ${item.label || ''}
            </text>
        `;
    }).join('\n');

    const svgOverlay = `
        <svg width="${width}" height="${height}">
            ${svgRects}
        </svg>
    `;

    return image
        .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
        .png()
        .toBuffer();
}

/**
 * Overlays navigation mesh tiles on an image.
 * Returns a new image buffer.
 */
export async function drawNavMesh(imageBuffer: Buffer, tiles: Box2DItem[]): Promise<Buffer> {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width || 1000;
    const height = metadata.height || 1000;

    const svgTiles = tiles.map(tile => {
        const [ymin, xmin, ymax, xmax] = tile.box_2d;

        const x = (xmin / 1000) * width;
        const y = (ymin / 1000) * height;
        const w = ((xmax - xmin) / 1000) * width;
        const h = ((ymax - ymin) / 1000) * height;

        const isSidebar = tile.label === 'sidebar_slot';
        const color = isSidebar ? '#FF00FF' : '#00FF00'; // Magenta for UI, Green for walkables

        return `
            <rect x="${x}" y="${y}" width="${w}" height="${h}" 
                  fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="1" />
             <text x="${x + w / 2}" y="${y + h / 2}" font-family="Arial" font-size="10" fill="white" text-anchor="middle" dominant-baseline="middle" style="text-shadow: 1px 1px 1px black;">
                ${tile.label || ''}
            </text>
        `;
    }).join('\n');

    const svgOverlay = `
        <svg width="${width}" height="${height}">
            ${svgTiles}
        </svg>
    `;

    return image
        .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
        .png()
        .toBuffer();
}

// Simple hash to color
function stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}
