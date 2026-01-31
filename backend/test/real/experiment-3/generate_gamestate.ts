
import * as fs from 'fs';
import * as path from 'path';

const EXPERIMENT_DIR = path.join(__dirname);
const ANALYSIS_PATH = path.join(EXPERIMENT_DIR, 'analysis.json');
const NAVMESH_PATH = path.join(EXPERIMENT_DIR, 'navmesh.json');
const GAMESTATE_PATH = path.join(EXPERIMENT_DIR, 'gamestate.json');

// Helper to determine team/type based on label (heuristic)
function categorize(label: string) {
    const l = label.toLowerCase();
    if (l.includes('icon') || l.includes('button')) return { type: 'ui', team: 'neutral' };
    if (l.includes('rock') || l.includes('obstacle') || l.includes('tree')) return { type: 'obstacle', team: 'neutral' };
    if (l.includes('hero') || l.includes('knight') || l.includes('archer') || l.includes('wizard')) return { type: 'unit', team: 'blue' };
    if (l.includes('enemy') || l.includes('skeleton') || l.includes('demon') || l.includes('slime')) return { type: 'unit', team: 'red' };
    return { type: 'prop', team: 'neutral' };
}

function generateGamestate() {
    console.log("🔄 Generating Game State...");

    if (!fs.existsSync(ANALYSIS_PATH)) {
        console.error("❌ analysis.json not found. Run Step 3.");
        return;
    }

    const items = JSON.parse(fs.readFileSync(ANALYSIS_PATH, 'utf-8'));

    // Convert items to entities
    const entities = items.map((item: any, index: number) => {
        const { type, team } = categorize(item.label);

        // Construct the Proxy URL
        // We assume the route is /api/asset-proxy/experiment-3/extracted/LABEL.png
        // NOTE: item.label must match the extracted filename. 
        // We removed timestamp, so it is just label + .png
        const assetUrl = `/api/asset-proxy/experiment-3/extracted/${encodeURIComponent(item.label)}.png`;

        return {
            id: `entity_${index}`,
            label: item.label,
            team,
            type,
            src: assetUrl, // <--- THE KEY CHANGE
            pixel_box: item.box_2d || item.pixel_box,
            // We could map to grid_position if we had the navmesh logic here, 
            // but for now let's just keep pixel_box which the engine can use or we can compute grid later.
            // Preserving existing structure if possible.
        };
    });

    const gamestate = {
        grid: { rows: 6, cols: 6 }, // Hardcoded for now or derived from navmesh
        entities
    };

    fs.writeFileSync(GAMESTATE_PATH, JSON.stringify(gamestate, null, 2));
    console.log(`✅ Generated gamestate.json with ${entities.length} entities.`);
    console.log(`   Sample SRC: ${entities[0]?.src}`);
}

generateGamestate();
