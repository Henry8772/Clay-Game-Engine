
import { DetectedItem } from './vision_agent';
import { LLMClient } from '../client';

function categorize(label: string) {
    const l = label.toLowerCase();
    if (l.includes('icon') || l.includes('button')) return { type: 'ui', team: 'neutral' };
    if (l.includes('rock') || l.includes('obstacle') || l.includes('tree')) return { type: 'obstacle', team: 'neutral' };
    if (l.includes('hero') || l.includes('knight') || l.includes('archer') || l.includes('wizard')) return { type: 'unit', team: 'blue' };
    if (l.includes('enemy') || l.includes('skeleton') || l.includes('demon') || l.includes('slime')) return { type: 'unit', team: 'red' };
    return { type: 'prop', team: 'neutral' };
}

export async function runStateAgent(
    client: LLMClient,
    items: DetectedItem[],
    navMesh: any[],
    runId: string
): Promise<any> {
    console.log("[StateAgent] Generating Minimal Game State...");

    // Map detected items to Game Entities
    const entities = items.map((item, index) => {
        const { type, team } = categorize(item.label);
        const safeLabel = item.label.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const assetUrl = `extracted/${encodeURIComponent(safeLabel)}.png`;

        // Template ID (keep for reference if needed, but no longer links to blueprint)
        const templateId = `tpl_${safeLabel}`;

        return {
            id: `entity_${index}`,
            t: templateId,
            label: item.label,
            team,
            type,
            src: assetUrl,
            pixel_box: item.box_2d,
        };
    });

    const initialState = {
        meta: {
            turnCount: 1,
            activePlayerId: "player",
            phase: "main",
            runId: runId,
            version: "2.0", // Bump version for minimal state
            vars: {}
        },
        // Entities Map (ID -> Entity)
        entities: entities.reduce((acc: any, e: any) => {
            acc[e.id] = e;
            return acc;
        }, {}) as any,
        grid: { rows: 6, cols: 6 }, // Legacy support
        navMesh // Embed navmesh for debugging/client usage
    };

    return {
        initialState,
        // No blueprints
        rules: "Standard Skirmish Rules" // Generic placeholder
    };
}
