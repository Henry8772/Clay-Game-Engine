
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
    // IMPORTANT: Client must prefix runs with special segment or we heuristically check?
    // Let's assume the client sends /api/asset-proxy/runs/{runId}/...
    // If path starts with "runs", map to RUNS_BASE_DIR, else map to TEST_BASE_DIR (backwards compat)

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

            return new NextResponse('Forbidden: Access outside base directory', { status: 403 });
        }
    }

    // Security check: Extension whitelist
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.json'];
    const ext = path.extname(potentialPath).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        return new NextResponse('Forbidden: Invalid file type', { status: 403 });
    }

    if (!fs.existsSync(potentialPath)) {
        return new NextResponse('Not Found', { status: 404 });
    }

    try {
        const fileBuffer = fs.readFileSync(potentialPath);

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
