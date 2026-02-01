import fs from 'fs';
import path from 'path';

const TMP_DIR = path.resolve(__dirname, '../.tmp');
const RUN_ID_FILE = path.join(TMP_DIR, 'vitest_run_id');

export const setup = async () => {
    // Use a fixed ID to simplify workflow (overwrite same dir)
    const runId = `test_run_latest`;

    if (!fs.existsSync(TMP_DIR)) {
        fs.mkdirSync(TMP_DIR, { recursive: true });
    }

    fs.writeFileSync(RUN_ID_FILE, runId);
    console.log(`\n[Global Setup] Generated Run ID: ${runId}`);
    console.log(`[Global Setup] Saved to: ${RUN_ID_FILE}\n`);
};

export const teardown = async () => {
    // Optional: Clean up if we wanted to delete the file, but keeping it might be useful for debugging last run.
};
