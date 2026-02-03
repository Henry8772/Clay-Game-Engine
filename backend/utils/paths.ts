import fs from "fs/promises";
import path from "path";

export async function saveAsset(runId: string, buffer: Buffer, filename: string): Promise<string> {
    // 1. Define the absolute path on the server
    const runDir = path.join(process.cwd(), "backend", "data", "runs", runId);

    // 2. Ensure directory exists (Recursive)
    await fs.mkdir(runDir, { recursive: true });

    // 3. Write file
    const filePath = path.join(runDir, filename);
    await fs.writeFile(filePath, buffer);

    console.log(`[FileSystem] Saved asset: ${filePath}`);

    // 4. Return JUST the filename (for the JSON state)
    // The consumer logic (agent) handles prefixing if needed, but the requirement 
    // is to return the filename for the state which should be relative.
    return filename;
}
