
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
    // We only allow access to backend/test/real
    const BASE_DIR = path.join(process.cwd(), 'backend', 'test', 'real');

    // Construct the full path
    const potentialPath = path.join(BASE_DIR, ...filePathArray);

    // Security check: Ensure the resolved path starts with BASE_DIR
    if (!potentialPath.startsWith(BASE_DIR)) {
        return new NextResponse('Forbidden: Access outside base directory', { status: 403 });
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
                'Cache-Control': 'public, max-age=3600, immutable',
            },
        });
    } catch (err) {
        console.error("Error reading file:", err);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
