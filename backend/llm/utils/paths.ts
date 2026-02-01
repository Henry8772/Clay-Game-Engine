import path from 'path';

// Resolve the root of the backend directory
// This file is in backend/llm/utils/paths.ts
// So we go up 2 levels: utils -> llm -> backend
export const BACKEND_ROOT = path.resolve(__dirname, '../..');

export const DATA_RUNS_DIR = path.join(BACKEND_ROOT, 'data/runs');

console.log(`[Paths] Backend Root resolved to: ${BACKEND_ROOT}`);
console.log(`[Paths] Data Runs Dir resolved to: ${DATA_RUNS_DIR}`);
