
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    // Await params in newer Next.js versions if needed, or just access if using older types.
    // In Next 15+ params is a promise, but in 14 it might not be. 
    // Safest to handle it as a promise or value depending on the environment.
    // Given the 'await params' pattern is becoming standard, let's try to await it if it's a promise,
    // or use it directly.

    // NOTE: In Next.js App Router, params is effectively a promise in recent canary/15, 
    // but often treated as object in 13/14. 
    // Let's assume standard behavior. If `params` is a promise we await it.
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path;

    if (!pathSegments || pathSegments.length === 0) {
        return new NextResponse('Path not specified', { status: 400 });
    }

    // Construct the file path relative to the project root
    // We assume the project root is process.cwd()
    // Target: backend/test/real/experiment-2/...
    const requestedPath = path.join(...pathSegments);

    // Security check: prevent directory traversal (primitive)
    if (requestedPath.includes('..')) {
        return new NextResponse('Invalid path', { status: 403 });
    }

    const experimentDir = path.join(process.cwd(), 'backend', 'test', 'real', 'experiment-2');
    const filePath = path.join(experimentDir, requestedPath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return new NextResponse(`File not found: ${requestedPath}`, { status: 404 });
    }

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.json') contentType = 'application/json';
    else if (ext === '.txt' || ext === '.md') contentType = 'text/plain';

    // Read file
    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
        headers: {
            'Content-Type': contentType,
            // Optional: Cache-Control for development
            'Cache-Control': 'no-store, must-revalidate'
        }
    });
}
