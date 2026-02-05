import path from 'path';
import fs from 'fs';

// Resolve the root of the backend directory
// We need to handle both local development (backend/ts-node) and Next.js (root)
let backendRoot = path.resolve(__dirname, '../..'); // Default fallback

const cwd = process.cwd();
// Heuristic: Identify backend root by the presence of 'llm' directory which is unique to backend root
if (fs.existsSync(path.join(cwd, 'llm'))) {
    // We are in the backend root
    backendRoot = cwd;
} else if (fs.existsSync(path.join(cwd, 'backend', 'llm'))) {
    // We are in the project root
    backendRoot = path.join(cwd, 'backend');
} else if (cwd.endsWith('backend') && fs.existsSync(path.join(cwd, '../llm'))) {
    // Fallback: if we are in a subdirectory of backend (though likely covered by first case if we are literally IN backend)
    // Actually, if we are inside backend, cwd ends in backend, and llm is inside.
    // The first check covers 'gemini-ai-engine/backend' where 'llm' exists.
    // This else block is just a safe fallback or for different structures.
    backendRoot = cwd;
}

export const BACKEND_ROOT = backendRoot;

export const DATA_RUNS_DIR = path.join(BACKEND_ROOT, 'data/runs');

console.log(`[Paths] Backend Root resolved to: ${BACKEND_ROOT}`);
console.log(`[Paths] Data Runs Dir resolved to: ${DATA_RUNS_DIR}`);

export const getRunDir = (runId: string) => path.join(DATA_RUNS_DIR, runId);

export const saveAsset = async (runId: string, buffer: Buffer, filename: string) => {
    const runDir = getRunDir(runId);
    if (!fs.existsSync(runDir)) {
        await fs.promises.mkdir(runDir, { recursive: true });
    }
    const assetPath = path.join(runDir, filename);
    await fs.promises.writeFile(assetPath, buffer);
    return filename; // Return relative filename for asset proxy
};

