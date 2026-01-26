import sharp from 'sharp';

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
