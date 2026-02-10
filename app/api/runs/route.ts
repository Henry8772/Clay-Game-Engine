
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
            .map(dirent => {
                const runId = dirent.name;
                const runPath = path.join(RUNS_BASE_DIR, runId);

                // Check if complete (has gamestate.json)
                const isComplete = fs.existsSync(path.join(runPath, 'gamestate.json'));

                // Get Title from design.json if available
                let title = runId;
                try {
                    const designPath = path.join(runPath, 'design.json');
                    if (fs.existsSync(designPath)) {
                        const design = JSON.parse(fs.readFileSync(designPath, 'utf8'));
                        // Assuming design has a title or using the first asset? 
                        // Let's use the runId but flag it differently or maybe the prompt if we had it.
                        // For now, let's just clean up the timestamp for display if it's a run_timestamp
                    }
                } catch (e) {
                    // Ignore
                }

                return {
                    id: runId,
                    isComplete,
                    timestamp: fs.statSync(runPath).birthtimeMs
                };
            })
            .sort((a, b) => b.timestamp - a.timestamp); // Newest first

        return NextResponse.json({ runs });
    } catch (e) {
        console.error("Failed to list runs:", e);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
