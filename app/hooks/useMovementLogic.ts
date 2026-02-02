import { useCallback } from 'react';
import { MovementLogic } from '../../backend/llm/agents/universal_state_types';

export function useMovementLogic() {

    // Helper: Parse "tile_rX_cY" references
    const parseTile = (label: string) => {
        const match = label.match(/r(\d+)_c(\d+)/);
        if (!match) return null;
        return { r: parseInt(match[1]), c: parseInt(match[2]) };
    };

    const getNeighbors = (r: number, c: number, boardSize = 6) => {
        const neighbors = [];
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // Cardinal only
        for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
                neighbors.push({ r: nr, c: nc, label: `tile_r${nr}_c${nc}` });
            }
        }
        return neighbors;
    };

    /**
     * Calculates reachable tiles based on start position, movement logic, and obstacles.
     * @param startLabel - e.g. "tile_r2_c2"
     * @param movement - { type: "walk", range: 3 }
     * @param occupiedTiles - Set of tile labels that are blocked by other units/obstacles
     * @param navMeshLabels - List of ALL valid tile labels (to check existence)
     */
    const getReachableTiles = useCallback((
        startLabel: string,
        movement: MovementLogic,
        occupiedTiles: Set<string>,
        navMeshLabels: string[]
    ): Set<string> => {
        const reachable = new Set<string>();
        const start = parseTile(startLabel);
        if (!start) return reachable; // Invalid start

        const validTiles = new Set(navMeshLabels);

        if (movement.type === 'fly' || movement.type === 'teleport') {
            // Simple Manhattan or Chebyshev distance check
            // For now, let's assume Manhattan for grid movement feel, or Chebyshev for diagonal?
            // "Range 3" usually means 3 steps.
            // For flying, we just check distance <= range.

            navMeshLabels.forEach(tile => {
                const pos = parseTile(tile);
                if (pos) {
                    const dist = Math.abs(pos.r - start.r) + Math.abs(pos.c - start.c);
                    if (dist <= movement.range && tile !== startLabel && !occupiedTiles.has(tile)) {
                        reachable.add(tile);
                    }
                }
            });
            return reachable;
        }

        // WALK: Flood Fill (BFS)
        // Respects obstacles/occupied tiles.

        const queue: { r: number, c: number, dist: number }[] = [{ ...start, dist: 0 }];
        const visited = new Set<string>();
        visited.add(startLabel);

        while (queue.length > 0) {
            const current = queue.shift()!;

            if (current.dist >= movement.range) continue;

            const neighbors = getNeighbors(current.r, current.c);

            for (const n of neighbors) {
                // Check if valid board tile
                if (!validTiles.has(n.label)) continue;

                // Check if visited
                if (visited.has(n.label)) continue;

                // Check if blocked (unless it's the destination, but usually you can't walk THROUGH blocked tiles)
                // "Occupied" usually means a unit is there. 
                // In standard tactics, you can't walk onto an occupied tile (unless attacking, but this is move logic).
                // You also usually can't walk THROUGH enemies, but might walk through allies.
                // For simplicity: Blocked tiles block movement.
                if (occupiedTiles.has(n.label)) continue;

                visited.add(n.label);
                reachable.add(n.label);

                queue.push({ r: n.r, c: n.c, dist: current.dist + 1 });
            }
        }

        return reachable;
    }, []);

    return {
        getReachableTiles
    };
}
