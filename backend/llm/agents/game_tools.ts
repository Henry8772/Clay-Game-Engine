export type GameTool =
    | { name: "MOVE", args: { entityId: string, toZoneId: string } }
    | { name: "SPAWN", args: { templateId: string, toZoneId: string, owner: string } }
    | { name: "ATTACK", args: { attackerId: string, targetId: string, damage: number } }
    | { name: "DESTROY", args: { entityId: string } }
    | { name: "NARRATE", args: { message: string } };

export const AVAILABLE_TOOLS = `
1. MOVE(entityId, toZoneId) -> Teleport a unit.
2. SPAWN(templateId, toZoneId, owner) -> Create a new unit from a card/template.
3. ATTACK(attackerId, targetId, damage) -> Deal damage and play animation.
4. DESTROY(entityId) -> Remove an entity (e.g. card used, unit dead).
5. NARRATE(message) -> Show text to the user.
`;
