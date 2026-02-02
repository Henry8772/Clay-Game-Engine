
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Force dynamic to ensure we check disk every time
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const RUNS_BASE_DIR = path.join(process.cwd(), 'backend', 'data', 'runs');

        if (!fs.existsSync(RUNS_BASE_DIR)) {
            return NextResponse.json({ runs: [] });
        }

        const entries = fs.readdirSync(RUNS_BASE_DIR, { withFileTypes: true });

        const runs = entries
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            // Optional: Sort by creation time if we wanted, but alpha sort is default and fine for IDs like "run_timestamp"
            .sort((a, b) => b.localeCompare(a)); // Newest first usually

        return NextResponse.json({ runs });
    } catch (e) {
        console.error("Failed to list runs:", e);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
