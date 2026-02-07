
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Force dynamic to ensure we check disk every time
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const RUNS_BASE_DIR = path.join(process.cwd(), 'backend', 'data', 'runs');

        if (!fs.existsSync(RUNS_BASE_DIR)) {
            return NextResponse.json({ runs: [] });
        }

        // Get username from query parameter
        const { searchParams } = new URL(request.url);
        const username = searchParams.get('username');

        let runs: { name: string; path: string }[] = [];

        // Always include public runs for all users
        const publicDir = path.join(RUNS_BASE_DIR, 'public');
        if (fs.existsSync(publicDir)) {
            const publicEntries = fs.readdirSync(publicDir, { withFileTypes: true });
            runs = runs.concat(
                publicEntries
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => ({
                        name: dirent.name,
                        path: `public/${dirent.name}`
                    }))
            );
        }

        // If username is provided, include user-specific runs
        if (username) {
            const userDir = path.join(RUNS_BASE_DIR, username);
            if (fs.existsSync(userDir)) {
                const userEntries = fs.readdirSync(userDir, { withFileTypes: true });
                runs = runs.concat(
                    userEntries
                        .filter(dirent => dirent.isDirectory())
                        .map(dirent => ({
                            name: dirent.name,
                            path: `${username}/${dirent.name}`
                        }))
                );
            }
        }

        // Sort by newest first (by name)
        runs.sort((a, b) => b.name.localeCompare(a.name));

        return NextResponse.json({ runs });
    } catch (e) {
        console.error("Failed to list runs:", e);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
