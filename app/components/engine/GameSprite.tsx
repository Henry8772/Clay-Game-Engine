"use client";

import * as PIXI from 'pixi.js';
import React, { useEffect, useRef, useState } from 'react';
import { usePixiApp } from '../test/PixiStage';
import { useCollision } from '../test/CollisionSystem';
import { lerp, clamp } from '../../hooks/useGamePhysics';
import { useFX } from './FXSystem';
interface GameSpriteProps {
    id: string;
    name: string;
    initialX: number; // Logical/Grid X
    initialY: number; // Logical/Grid Y
    color: string | number;
    src?: string;
    onAction: (command: string) => void;
    displayMode?: 'normal' | 'mask';
    config?: any;
    debugZones?: boolean;
}

// Visual Constants
const LERP_FACTOR = 0.25; // 25% catchup per frame (Quick but weighty)
const MAX_TILT = 0.15; // Radians
const VELOCITY_TILT_MODIFIER = 0.005; // Strength of tilt
const HOVER_SCALE = 1.15;
const HOVER_Y_OFFSET = -10; // "Lift" up visually
const SHADOW_OFFSET_X = 0;
const SHADOW_OFFSET_Y = 20;

export const GameSprite = ({ id, name, initialX, initialY, color, src, onAction, displayMode = 'normal', config }: GameSpriteProps) => {
    const { app, stage } = usePixiApp();
    const { getZoneAt, getEntityAt, registerEntity, unregisterEntity } = useCollision();
    const { shake } = useFX();

    // -- Physics State Refs --
    // We use refs for physics loop to avoid React re-renders on every frame (60fps)
    const renderPos = useRef({ x: initialX, y: initialY });
    const targetPos = useRef({ x: initialX, y: initialY }); // Where we WANT to be
    const velocity = useRef({ x: 0, y: 0 });

    // -- Interaction State --
    const isHeld = useRef(false);
    const pickupOffset = useRef({ x: 0, y: 0 });
    const dragStartZone = useRef<string | null>(null);

    // -- Pixi Objects --
    const containerRef = useRef<PIXI.Container | null>(null);
    const spriteRef = useRef<PIXI.Sprite | null>(null);
    const shadowRef = useRef<PIXI.Graphics | null>(null);
    const contentRef = useRef<PIXI.Container | null>(null); // Holds the sprite/shape for scaling/tilting independent of shadow

    // -- Setup & Heartbeat --
    useEffect(() => {
        if (!app || !stage) return;

        // 1. Build Visual Hierarchy
        const container = new PIXI.Container();
        container.x = initialX;
        container.y = initialY;
        container.zIndex = 2;
        container.sortableChildren = true;

        // Shadow (Rendered FIRST so it's behind)
        const shadow = new PIXI.Graphics();
        shadow.beginFill(0x000000, 0.3); // Black, 30% opacity
        shadow.drawEllipse(0, 0, 25, 10);
        shadow.endFill();
        shadow.filters = [new PIXI.BlurFilter(5)];
        shadow.y = 0; // Starts at base
        shadow.alpha = 0; // Hidden by default (Idle)
        container.addChild(shadow);
        shadowRef.current = shadow;

        // Content Container (The thing that moves/tilts)
        const content = new PIXI.Container();
        content.zIndex = 1;
        container.addChild(content);
        contentRef.current = content;

        // Visuals (Sprite or Fallback)
        if (displayMode === 'mask') {
            const graphics = new PIXI.Graphics();
            graphics.beginFill(color);
            graphics.drawRect(-50, -75, 100, 150);
            graphics.endFill();
            content.addChild(graphics);
        } else if (src) {
            PIXI.Assets.load(src).then(texture => {
                if (content.destroyed) return;
                const sprite = new PIXI.Sprite(texture);
                sprite.anchor.set(0.5, 0.5); // Center anchor for rotation
                sprite.height = 100; // Constrain for safety if needed, or rely on texture
                sprite.width = 100 * (texture.width / texture.height);
                // Alternatively, just trust the texture size or use config
                if (config?.width) sprite.width = config.width;
                if (config?.height) sprite.height = config.height;

                content.addChild(sprite);
                spriteRef.current = sprite;
            }).catch(err => {
                console.warn(`Failed to load asset: ${src}`, err);
                const graphics = new PIXI.Graphics();
                graphics.lineStyle(2, 0xFF0000);
                graphics.beginFill(0x330000);
                graphics.drawRect(-30, -30, 60, 60);
                graphics.endFill();
                content.addChild(graphics);
            });
        } else {
            // Fallback Circle
            const graphics = new PIXI.Graphics();
            graphics.beginFill(color);
            graphics.drawCircle(0, 0, 30);
            graphics.endFill();
            content.addChild(graphics);
        }

        // Enable Interactivity
        container.eventMode = 'static';
        container.cursor = 'pointer';

        // Register Entity for Collision
        registerEntity(id, { id, container, role: 'SPRITE' });

        // 2. The Physics Loop (Ticker)
        const updateTicker = (delta: number) => {
            if (container.destroyed) return;

            // A. Calculate Position (Lerp)
            // We lerp the CONTAINER's coordinates to the TARGET coordinates
            // Actually, usually in drag-n-drop, the mouse sets the position 1:1 for responsiveness,
            // but for "weight", we can lerp.
            // Let's Lerp the renderPos towards targetPos

            const lastX = renderPos.current.x;
            const newX = lerp(renderPos.current.x, targetPos.current.x, LERP_FACTOR);
            const newY = lerp(renderPos.current.y, targetPos.current.y, LERP_FACTOR);

            renderPos.current = { x: newX, y: newY };
            container.x = newX;
            container.y = newY;

            // B. Calculate Velocity
            const velX = newX - lastX;
            // velocity.current = { x: velX, y: newY - lastY };

            // C. Apply Tilt (Based on X velocity)
            if (content) {
                const targetRotation = clamp(velX * VELOCITY_TILT_MODIFIER, -MAX_TILT, MAX_TILT);
                // Smoothly lerp rotation too for extra juice
                content.rotation = lerp(content.rotation, targetRotation, 0.2);
            }

            // D. Visual State Logic
            if (isHeld.current) {
                // HOVER STATE
                // Scale up smoothly
                content.scale.x = lerp(content.scale.x, HOVER_SCALE, 0.2);
                content.scale.y = lerp(content.scale.y, HOVER_SCALE, 0.2);

                // Lift content up
                content.y = lerp(content.y, HOVER_Y_OFFSET, 0.2);

                // Show Shadow and move it down (to ground level relative to lifted content)
                shadow.alpha = lerp(shadow.alpha, 0.6, 0.1);
                shadow.scale.x = lerp(shadow.scale.x, 0.8, 0.1); // Shadow gets smaller as object goes up
                shadow.scale.y = lerp(shadow.scale.y, 0.8, 0.1);
                shadow.y = SHADOW_OFFSET_Y; // Keep shadow on "ground"
                container.zIndex = 100; // Float above all
            } else {
                // IDLE STATE
                // Reset Scale
                content.scale.x = lerp(content.scale.x, 1.0, 0.2);
                content.scale.y = lerp(content.scale.y, 1.0, 0.2);

                // Content settles back to 0
                content.y = lerp(content.y, 0, 0.2);

                // Hide shadow
                shadow.alpha = lerp(shadow.alpha, 0, 0.2);
                shadow.y = 0;
                container.zIndex = 2; // Back to normal layer
            }
        };

        app.ticker.add(updateTicker);

        // -- Event Handlers --

        const onPickup = (e: PIXI.FederatedPointerEvent) => {
            // 1. Logic
            isHeld.current = true;

            // 2. Setup Drag Anchor
            // Store where we clicked relative to the object's center to maintain that offset
            // NOTE: Since we are lerping container.x, we need to be careful.
            // The "Target" is what tracks the mouse. 
            // The "Render" (container) follows the target.

            const globalPos = e.global;
            // The target is currently at the container's pos (roughly)
            // We want Target = Mouse - Offset
            // So Offset = Mouse - Target
            pickupOffset.current = {
                x: globalPos.x - targetPos.current.x,
                y: globalPos.y - targetPos.current.y
            };

            // 3. Track Start Zone
            const startZone = getZoneAt(container.x, container.y);
            dragStartZone.current = startZone ? startZone.id : null;

            // 4. Notify Parent
            const pickupEvent = JSON.stringify({
                type: 'PICK_UP',
                entity: name,
                entityId: id,
                entityConfig: config,
                from: dragStartZone.current
            });
            onAction(pickupEvent);

            // 5. Global Listeners
            if (stage) {
                stage.eventMode = 'static';
                stage.on('pointermove', onDragMove);
                stage.on('pointerup', onRelease);
                stage.on('pointerupoutside', onRelease);
            }
        };

        const onDragMove = (e: PIXI.FederatedPointerEvent) => {
            if (!isHeld.current) return;
            const globalPos = e.global;

            // Update TARGET, not container directly. The ticker handles container.
            targetPos.current = {
                x: globalPos.x - pickupOffset.current.x,
                y: globalPos.y - pickupOffset.current.y
            };
        };

        const onRelease = (e: PIXI.FederatedPointerEvent) => {
            if (!isHeld.current) return;
            isHeld.current = false;

            // 1. Drop Logic
            const dropZone = getZoneAt(container.x, container.y);
            const toId = dropZone ? dropZone.id : null;
            const fromId = dragStartZone.current;

            // Check for Entity Collision (Attack?)
            const targetEntity = getEntityAt(container.x, container.y, id); // Exclude self
            const isAttack = !!targetEntity;

            console.log(`GameSprite ${name}: Dropped at`, { x: container.x, y: container.y, zone: toId, attackTarget: targetEntity?.id });

            // 2. Optimistic Snap or Rejection
            if (toId && dropZone) {
                if (isAttack && targetEntity) {
                    // ATTACK LUNGE!
                    shake(5); // Juice: Camera Shake on impact!

                    // Lunge PAST the target slightly (Juice)
                    const dirX = targetEntity.container.x - container.x;
                    const dirY = targetEntity.container.y - container.y;
                    // Normalize? Nah, just overshoot the target pos
                    targetPos.current = {
                        x: targetEntity.container.x + (dirX * 0.2),
                        y: targetEntity.container.y + (dirY * 0.2)
                    };

                    // After a brief delay, snap back to origin (or let next state update handle it)
                    // We assume attack doesn't move us to that tile usually? Or it does?
                    // Depends on game rules. Assuming "Melee Attack" often stays put or moves adjacent.
                    // For now, bounce back to start after lunge
                    setTimeout(() => {
                        if (!container.destroyed) {
                            targetPos.current = { x: initialX, y: initialY };
                        }
                    }, 150); // 150ms lunge

                } else {
                    // Normal Move - Snap to Zone Center?
                    // We don't have zone center easily, so just let it slide to target or stay at drop?
                    // targetPos.current = { x: dropZone.container.x, y: dropZone.container.y }; // If zone anchor is center?
                    // Zones are Top-Left usually?
                    // If we want to center:
                    targetPos.current = {
                        x: dropZone.container.x + dropZone.container.width / 2,
                        y: dropZone.container.y + dropZone.container.height / 2
                    };
                }
            } else {
                // Invalid Drop - Bounce Back!
                console.log("Invalid Drop - Reverting");
                targetPos.current = { x: initialX, y: initialY };
            }

            // 3. Notify Parent
            const event = JSON.stringify({
                type: isAttack ? 'ATTACK' : 'MOVE',
                entity: name,
                entityId: id,
                targetId: isAttack ? targetEntity?.id : undefined,
                from: fromId,
                to: toId
            });
            onAction(event);

            // 4. Cleanup Listeners
            if (stage) {
                stage.off('pointermove', onDragMove);
                stage.off('pointerup', onRelease);
                stage.off('pointerupoutside', onRelease);
            }
        }

        container.on('pointerdown', onPickup);

        // Add to Stage
        stage.addChild(container);
        containerRef.current = container;


        return () => {
            unregisterEntity(id);
            app.ticker.remove(updateTicker);
            if (stage) {
                stage.off('pointermove', onDragMove);
                stage.off('pointerup', onRelease);
                stage.off('pointerupoutside', onRelease);
                stage.removeChild(container);
            }
            container.destroy({ children: true });
        };

    }, [app, stage, id, name, onAction, src, displayMode, JSON.stringify(config)]); // Re-run if key props change

    // Allow Prop Updates to move the sprite (e.g. valid move confirmed by server)
    useEffect(() => {
        if (!isHeld.current) {
            // New position from server/props? Update Target!
            targetPos.current = { x: initialX, y: initialY };
            // Note: We don't snap renderPos, we let it lerp to the new home for "slide" effect
            // OR if it's a huge jump (teleport), maybe snap?
            // For now, slide is nice.
        }
    }, [initialX, initialY]);


    return null;
};
