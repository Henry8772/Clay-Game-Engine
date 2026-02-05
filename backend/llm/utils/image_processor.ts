import sharp from 'sharp';

interface Box2DItem {
    box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
    label?: string;
}

/**
 * Removes white (or near-white) background from an image buffer.
 * Converts white pixels to transparent.
 * 
 * @param buffer The input image buffer (PNG/JPEG)
 * @param threshold The threshold for "white" (0-255). Higher means more off-white colors are removed.
 * @returns Buffer of the processed PNG image with transparency.
 */
export async function removeWhiteBackground(buffer: Buffer, threshold: number = 240): Promise<Buffer> {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const width = metadata.width!;
    const height = metadata.height!;

    // Ensure we have an alpha channel
    const data = await image
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const pixelData = data.data;
    const channels = 4; // RGBA

    // Helper to get pixel index
    const getIndex = (x: number, y: number) => (y * width + x) * channels;

    // Helper to check if pixel is white
    const isWhite = (index: number) => {
        const r = pixelData[index];
        const g = pixelData[index + 1];
        const b = pixelData[index + 2];
        return r >= threshold && g >= threshold && b >= threshold;
    };

    // Visited set (1D array of booleans)
    const visited = new Uint8Array(width * height); // 0 = unvisited, 1 = visited

    // Stack for DFS
    const stack: [number, number][] = [];

    // Add corners if they are white
    const corners = [
        [0, 0],
        [width - 1, 0],
        [0, height - 1],
        [width - 1, height - 1]
    ];

    for (const [x, y] of corners) {
        const idx = getIndex(x, y);
        if (isWhite(idx)) {
            stack.push([x, y]);
            visited[y * width + x] = 1;
        }
    }

    // Directions: Up, Down, Left, Right
    const dx = [0, 0, -1, 1];
    const dy = [-1, 1, 0, 0];

    // Iterative DFS/Flood Fill
    while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        const idx = getIndex(cx, cy);

        // Set Alpha to 0 (Transparent)
        pixelData[idx + 3] = 0;

        // Check neighbors
        for (let i = 0; i < 4; i++) {
            const nx = cx + dx[i];
            const ny = cy + dy[i];

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nPos = ny * width + nx;
                if (visited[nPos] === 0) {
                    const nIdx = getIndex(nx, ny);
                    if (isWhite(nIdx)) {
                        visited[nPos] = 1;
                        stack.push([nx, ny]);
                    }
                }
            }
        }
    }

    return sharp(pixelData, {
        raw: {
            width,
            height,
            channels: 4
        }
    })
        .png()
        .toBuffer();
}

/**
 * Creates a transparent image from two images: one on valid white background and one on valid black background.
 * Uses the formula:
 * Alpha = 1.0 - (PixelOnWhite - PixelOnBlack)
 * TrueColor = PixelOnBlack / Alpha
 */
export async function createTransparencyMask(whiteBuffer: Buffer, blackBuffer: Buffer): Promise<Buffer> {
    const whiteImage = sharp(whiteBuffer);
    let blackImage = sharp(blackBuffer);

    const whiteMeta = await whiteImage.metadata();
    const blackMeta = await blackImage.metadata();

    const width = whiteMeta.width!;
    const height = whiteMeta.height!;

    // --- FIX START: Auto-correct size mismatch ---
    // If the AI gave us different sizes, force the black layer to stretch/squash to match the white layer.
    if (whiteMeta.width !== blackMeta.width || whiteMeta.height !== blackMeta.height) {
        console.warn(`[TransparencyMask] Dimension mismatch detected! Auto-fixing...`);
        console.warn(`White: ${whiteMeta.width}x${whiteMeta.height} | Black: ${blackMeta.width}x${blackMeta.height}`);

        // We use 'fill' to ignore aspect ratio and force exact pixel match
        const resizedBlackBuffer = await blackImage
            .resize({
                width: width,
                height: height,
                fit: 'fill'
            })
            .toBuffer();

        blackImage = sharp(resizedBlackBuffer);
    }
    // --- FIX END ---

    const [whiteData, blackData] = await Promise.all([
        whiteImage.ensureAlpha().raw().toBuffer(),
        blackImage.ensureAlpha().raw().toBuffer()
    ]);

    const outData = Buffer.alloc(width * height * 4);

    for (let i = 0; i < whiteData.length; i += 4) {
        // Normalize 0-255 to 0-1
        const rw = whiteData[i] / 255;
        const gw = whiteData[i + 1] / 255;
        const bw = whiteData[i + 2] / 255;

        const rb = blackData[i] / 255;
        const gb = blackData[i + 1] / 255;
        const bb = blackData[i + 2] / 255;

        // Calculate Alpha: A = 1 - (WhitePixel - BlackPixel)
        // This math relies on the fact that:
        // PixelOnWhite = Color * Alpha + 1 * (1 - Alpha)
        // PixelOnBlack = Color * Alpha + 0 * (1 - Alpha)
        // Therefore: White - Black = 1 - Alpha  =>  Alpha = 1 - (White - Black)

        const diffR = rw - rb;
        const diffG = gw - gb;
        const diffB = bw - bb;

        // Average the differences to get a smoother alpha
        const avgDiff = (diffR + diffG + diffB) / 3;
        let alpha = 1.0 - avgDiff;

        // Clamp alpha to valid range
        alpha = Math.max(0, Math.min(1, alpha));

        // Color Recovery: C = PixelOnBlack / Alpha
        let r = 0, g = 0, b = 0;

        if (alpha > 0.01) {
            r = rb / alpha;
            g = gb / alpha;
            b = bb / alpha;
        }

        outData[i] = Math.max(0, Math.min(255, Math.round(r * 255)));
        outData[i + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
        outData[i + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
        outData[i + 3] = Math.max(0, Math.min(255, Math.round(alpha * 255)));
    }

    return sharp(outData, {
        raw: {
            width,
            height,
            channels: 4
        }
    })
        .png()
        .toBuffer();
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
