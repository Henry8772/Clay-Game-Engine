
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Force dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const resolvedParams = await params;
    const filePathArray = resolvedParams.path || [];

    if (filePathArray.length === 0) {
        return new NextResponse('Bad Request', { status: 400 });
    }

    // Security: Root Jail
    // We only allow access to backend/test/real and backend/data/runs
    const TEST_BASE_DIR = path.join(process.cwd(), 'backend', 'test', 'real');
    const RUNS_BASE_DIR = path.join(process.cwd(), 'backend', 'data', 'runs');

    // Construct the full path
    // Client sends /api/asset-proxy/runs/{runId}/... or /api/asset-proxy/runs/{username}/{runId}/...
    // We'll try the path as-is first, then fall back to boardgame if it's not found

    let potentialPath: string;

    if (filePathArray[0] === 'runs') {
        // Remove "runs" from the start and join with RUNS_BASE_DIR
        const relativePath = filePathArray.slice(1);
        potentialPath = path.join(RUNS_BASE_DIR, ...relativePath);

        // Security check for Runs
        if (!potentialPath.startsWith(RUNS_BASE_DIR)) {
            return new NextResponse('Forbidden: Access outside runs directory', { status: 403 });
        }
    } else {
        // Legacy/Experiment path
        potentialPath = path.join(TEST_BASE_DIR, ...filePathArray);

        // Security check for Tests
        if (!potentialPath.startsWith(TEST_BASE_DIR)) {
            console.log("Access attempt outside base:", potentialPath);
            return new NextResponse('Forbidden: Access outside base directory', { status: 403 });
        }
    }

    // Security check: Extension whitelist
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.json'];
    const ext = path.extname(potentialPath).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        return new NextResponse('Forbidden: Invalid file type', { status: 403 });
    }

    let finalPath = potentialPath;

    // If this is a runs path, prioritize public folder first
    if (filePathArray[0] === 'runs') {
        // First, try to find in public folder
        const publicPath = path.join(RUNS_BASE_DIR, 'public', ...filePathArray.slice(1));
        if (fs.existsSync(publicPath) && publicPath.startsWith(RUNS_BASE_DIR)) {
            finalPath = publicPath;
        } else if (!fs.existsSync(potentialPath)) {
            // If public doesn't exist and user path doesn't exist, try public as fallback
            if (fs.existsSync(publicPath) && publicPath.startsWith(RUNS_BASE_DIR)) {
                finalPath = publicPath;
            }
        }
    }

    if (!fs.existsSync(finalPath)) {
        return new NextResponse('Not Found', { status: 404 });
    }

    try {
        const fileBuffer = fs.readFileSync(finalPath);

        // Determine mime type
        let contentType = 'application/octet-stream';
        if (ext === '.png') contentType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.json') contentType = 'application/json';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (err) {
        console.error("Error reading file:", err);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
