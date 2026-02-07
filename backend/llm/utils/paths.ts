import path from 'path';
import fs from 'fs';

// Resolve the root of the backend directory
// We need to handle both local development (backend/ts-node) and Next.js (root)
let backendRoot = path.resolve(__dirname, '../..'); // Default fallback

const cwd = process.cwd();
// Heuristic: If we are running from project root (standard next dev), we expect a 'backend' folder
if (fs.existsSync(path.join(cwd, 'backend'))) {
    backendRoot = path.join(cwd, 'backend');
} else if (cwd.endsWith('backend')) {
    // If running from backend directory directly
    backendRoot = cwd;
}

export const BACKEND_ROOT = backendRoot;

export const DATA_RUNS_DIR = path.join(BACKEND_ROOT, 'data/runs');

console.log(`[Paths] Backend Root resolved to: ${BACKEND_ROOT}`);
console.log(`[Paths] Data Runs Dir resolved to: ${DATA_RUNS_DIR}`);

export const getRunDir = (runId: string, username?: string) => {
    // If username is provided and not "boardgame", organize by username
    // "boardgame" is a special case for public games
    if (username && username !== "boardgame") {
        return path.join(DATA_RUNS_DIR, username, runId);
    }
    // Default or boardgame path (public)
    return path.join(DATA_RUNS_DIR, runId);
};

export const saveAsset = async (runId: string, buffer: Buffer, filename: string, username?: string) => {
    const runDir = getRunDir(runId, username);
    if (!fs.existsSync(runDir)) {
        await fs.promises.mkdir(runDir, { recursive: true });
    }
    const assetPath = path.join(runDir, filename);
    await fs.promises.writeFile(assetPath, buffer);
    return filename; // Return relative filename for asset proxy
};

