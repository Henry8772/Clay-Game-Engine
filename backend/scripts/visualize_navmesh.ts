import { drawNavMesh } from '../llm/utils/image_processor';
import fs from 'fs';
import path from 'path';

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error("Usage: npx tsx backend/scripts/visualize_navmesh.ts <run_dir>");
        process.exit(1);
    }

    const runDirRelative = args[0];
    const runDir = path.isAbsolute(runDirRelative)
        ? runDirRelative
        : path.resolve(process.cwd(), runDirRelative);

    console.log(`Scanning directory: ${runDir}`);

    if (!fs.existsSync(runDir)) {
        console.error(`Directory not found: ${runDir}`);
        process.exit(1);
    }

    // 1. Get Background
    const bgPath = path.join(runDir, "background.png");
    if (!fs.existsSync(bgPath)) {
        console.error(`background.png not found in ${runDir}`);
        process.exit(1);
    }
    const bgBuffer = fs.readFileSync(bgPath);

    // 2. Get Data (Try gamestate.json first, then navmesh.json)
    let tiles: any[] = [];

    const gamestatePath = path.join(runDir, "gamestate.json");
    const navmeshPath = path.join(runDir, "navmesh.json");

    if (fs.existsSync(gamestatePath)) {
        console.log(`Found gamestate.json`);
        const gamestate = JSON.parse(fs.readFileSync(gamestatePath, 'utf-8'));
        if (gamestate.initialState && gamestate.initialState.navMesh && Array.isArray(gamestate.initialState.navMesh)) {
            tiles = gamestate.initialState.navMesh;
        } else if (gamestate.initialState && gamestate.initialState.navMesh && gamestate.initialState.navMesh.tiles) { // handle potential object wrapper
            tiles = gamestate.initialState.navMesh.tiles;
        } else if (Array.isArray(gamestate.navMesh)) { // Handle older weird wrapper
            tiles = gamestate.navMesh;
        } else {
            console.warn("Could not find array in gamestate.initialState.navMesh, checking navmesh.json...");
        }
    }

    if (tiles.length === 0 && fs.existsSync(navmeshPath)) {
        console.log(`Found navmesh.json`);
        const navmesh = JSON.parse(fs.readFileSync(navmeshPath, 'utf-8'));
        if (Array.isArray(navmesh)) {
            tiles = navmesh;
        } else if (navmesh.tiles && Array.isArray(navmesh.tiles)) {
            tiles = navmesh.tiles;
        }
    }

    if (tiles.length === 0) {
        console.error("No valid navmesh tiles found in gamestate.json or navmesh.json");
        process.exit(1);
    }

    console.log(`Drawing ${tiles.length} tiles...`);

    // 3. Draw
    const outBuffer = await drawNavMesh(bgBuffer, tiles);
    const outPath = path.join(runDir, "navmesh_segmented_debug.png");

    fs.writeFileSync(outPath, outBuffer);
    console.log(`Saved visualization to: ${outPath}`);
}

main().catch(console.error);
