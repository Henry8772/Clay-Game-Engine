
import { DetectedItem } from './vision_agent';

function categorize(label: string) {
    const l = label.toLowerCase();
    if (l.includes('icon') || l.includes('button')) return { type: 'ui', team: 'neutral' };
    if (l.includes('rock') || l.includes('obstacle') || l.includes('tree')) return { type: 'obstacle', team: 'neutral' };
    if (l.includes('hero') || l.includes('knight') || l.includes('archer') || l.includes('wizard')) return { type: 'unit', team: 'blue' };
    if (l.includes('enemy') || l.includes('skeleton') || l.includes('demon') || l.includes('slime')) return { type: 'unit', team: 'red' };
    return { type: 'prop', team: 'neutral' };
}

export function runStateAgent(
    items: DetectedItem[],
    navMesh: any[], // TODO: Use navmesh to snap to grid
    runId: string
): any {
    console.log("[StateAgent] Generating Game State...");

    // Convert items to entities
    const entities = items.map((item, index) => {
        const { type, team } = categorize(item.label);

        // Construct the Proxy URL
        const safeLabel = item.label.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        // IMPORTANT: Storage path is /api/asset-proxy/runs/{runId}/{filename}
        const assetUrl = `/api/asset-proxy/runs/${runId}/extracted/${encodeURIComponent(safeLabel)}.png`;

        return {
            id: `entity_${index}`,
            label: item.label,
            team,
            type,
            src: assetUrl,
            pixel_box: item.box_2d,
            // TODO: Add grid_position derived from navMesh
        };
    });

    const gamestate = {
        meta: {
            runId: runId,
            version: "1.0"
        },
        grid: { rows: 6, cols: 6 }, // Hardcoded for now until we parse navmesh better
        entities,
        navMesh // Embed navmesh for debugging
    };

    return gamestate;
}
