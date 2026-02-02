"use client";

import * as PIXI from 'pixi.js';
import React, { useEffect, useRef } from 'react';
import { usePixiApp } from './PixiStage';
import { useCollision } from './CollisionSystem';

interface GameEntityProps {
    id: string;
    name: string;
    initialX: number;
    initialY: number;
    color: string; // Hex string handling if needed, but PIXI takes number/string usually
    src?: string;
    onAction: (command: string) => void;
    displayMode?: 'normal' | 'mask';
    config?: any;
}

export const GameEntity = ({ id, name, initialX, initialY, color, src, onAction, displayMode = 'normal', config }: GameEntityProps) => {
    const { app, stage } = usePixiApp();
    const { getZoneAt } = useCollision(); // Access Collision System
    const containerRef = useRef<PIXI.Container | null>(null);
    const isHeld = useRef(false);
    const pickupOffset = useRef({ x: 0, y: 0 });
    const dragStartZone = useRef<string | null>(null); // Track where drag started

    useEffect(() => {
        if (!app || !stage) return;

        // 1. Create Container
        const container = new PIXI.Container();
        container.x = initialX;
        container.y = initialY;
        container.zIndex = 2; // Layer 2 (Top - Entities)

        // Enable interactivity
        container.eventMode = 'static';
        container.cursor = 'pointer';

        if (displayMode === 'mask') {
            const graphics = new PIXI.Graphics();
            graphics.beginFill(color);
            graphics.drawRect(-50, -75, 100, 150); // Approximating card size/anchor centered
            graphics.endFill();
            container.addChild(graphics);
        } else if (src) {
            const sprite = PIXI.Sprite.from(src);
            sprite.anchor.set(0.5);
            // Optional: Scale sprite if needed, or assume src is sized correctly for now
            // But let's limit size just in case it's huge
            container.addChild(sprite);
        } else {
            const graphics = new PIXI.Graphics();
            graphics.beginFill(color);
            graphics.drawCircle(0, 0, 30);
            graphics.endFill();
            container.addChild(graphics);
        }

        // 3. Create Text Label (Only in normal mode)
        if (displayMode === 'normal') {
            const textStyle = new PIXI.TextStyle({
                fill: 'white',
                fontSize: 14,
                fontFamily: 'Arial',
                align: 'center',
                stroke: 'black',
                strokeThickness: 2
            });
            const text = new PIXI.Text(name, textStyle);
            text.anchor.set(0.5);
            text.y = src ? 100 : 40; // Adjust label position below image
            container.addChild(text);
        }

        // 4. Interaction Logic
        // 4. Interaction Logic: Click-to-Pickup

        const onFollow = (e: PIXI.FederatedPointerEvent) => {
            if (isHeld.current && container.parent) {
                const newPosition = e.getLocalPosition(container.parent);
                container.x = newPosition.x - pickupOffset.current.x;
                container.y = newPosition.y - pickupOffset.current.y;
            }
        };

        const onPlace = (e: PIXI.FederatedPointerEvent) => {
            if (isHeld.current) {
                isHeld.current = false;
                container.alpha = 1;

                // Resolve Drop Zone
                const dropZone = getZoneAt(container.x, container.y);
                const toId = dropZone ? dropZone.id : null;
                const fromId = dragStartZone.current;

                // Semantic Event
                const event = JSON.stringify({
                    type: 'MOVE',
                    entity: name, // Using Label/Name as ID for readability
                    entityId: id,
                    from: fromId,
                    to: toId
                });

                onAction(event);

                // CLEANUP: Remove global listeners from stage
                if (stage) {
                    stage.off('pointermove', onFollow);
                    stage.off('pointerdown', onPlace);
                }
            }
        };

        const onPickup = (e: PIXI.FederatedPointerEvent) => {
            // If already held, treat click as drop (though normally onPlace catches this via stage)
            if (isHeld.current) {
                onPlace(e);
                return;
            }

            isHeld.current = true;

            // Calculate Offset
            const currentPosition = e.getLocalPosition(container.parent);
            pickupOffset.current = {
                x: currentPosition.x - container.x,
                y: currentPosition.y - container.y
            };

            container.alpha = 0.5;

            // Resolve Start Zone
            const startZone = getZoneAt(container.x, container.y);
            dragStartZone.current = startZone ? startZone.id : null;

            const pickupEvent = JSON.stringify({
                type: 'PICK_UP',
                entity: name,
                entityId: id,
                entityConfig: config,
                from: dragStartZone.current
            });
            console.log('Pickup Event:', pickupEvent);
            onAction(pickupEvent);

            // Bind follow/place to STAGE
            if (stage) {
                stage.eventMode = 'static';
                stage.on('pointermove', onFollow);

                // Add "Place" listener on next tick to avoid immediate trigger from current bubble
                requestAnimationFrame(() => {
                    stage.on('pointerdown', onPlace);
                });
            }
        };

        container.on('pointerdown', onPickup);

        // Add to Stage
        stage.addChild(container);
        containerRef.current = container;

        // Cleanup
        return () => {
            if (stage && container) {
                stage.removeChild(container);
                container.destroy({ children: true }); // Clean up texture memory if generated (graphics are auto-cleaned mostly)
            }
        };
    }, [app, stage, initialX, initialY, color, name, onAction, src, displayMode, config]);

    return null; // This component renders nothing in React DOM
};
