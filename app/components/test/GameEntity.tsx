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
}

export const GameEntity = ({ id, name, initialX, initialY, color, src, onAction, displayMode = 'normal' }: GameEntityProps) => {
    const { app, stage } = usePixiApp();
    const { getZoneAt } = useCollision(); // Access Collision System
    const containerRef = useRef<PIXI.Container | null>(null);
    const isDragging = useRef(false);
    const dragStartZone = useRef<string | null>(null); // Track where drag started

    // Helper: Convert Pixels to Chess Notation (Mock)
    // REPLACED by CollisionSystem
    // const getGridLocation = ...

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

        // 2. Create Visuals (Sprite or Graphics)
        // MASK MODE: Previously handled here, now filtered in ActorLayer.
        // But keeping logic just in case useful later, or we can revert.
        // Actually, let's keep it simple: if somehow called in mask mode, render solid.
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
        let dragOffset = { x: 0, y: 0 };

        const onDragMove = (e: PIXI.FederatedPointerEvent) => {
            if (isDragging.current && container.parent) {
                const newPosition = e.getLocalPosition(container.parent);
                container.x = newPosition.x - dragOffset.x;
                container.y = newPosition.y - dragOffset.y;
            }
        };

        const onDragEnd = (e?: PIXI.FederatedPointerEvent) => {
            if (isDragging.current) {
                isDragging.current = false;
                container.alpha = 1;

                // Resolve Drop Zone
                // We use global/stage coordinates (which container.x/y are in this simple setup)
                // Use the container center for drop detection
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
                    stage.off('pointermove', onDragMove);
                    stage.off('pointerup', onDragEnd);
                    stage.off('pointerupoutside', onDragEnd);
                }
            }
        };

        const onDragStart = (e: PIXI.FederatedPointerEvent) => {
            // Prevent bubbling if needed, but usually fine
            // e.stopPropagation(); 

            isDragging.current = true;
            const currentPosition = e.getLocalPosition(container.parent);
            dragOffset = {
                x: currentPosition.x - container.x,
                y: currentPosition.y - container.y
            };
            container.alpha = 0.5;

            // Resolve Start Zone
            const startZone = getZoneAt(container.x, container.y);
            dragStartZone.current = startZone ? startZone.id : null;

            // onAction(`User picked up ${name} from ${dragStartZone.current || 'Void'}`);

            // FIX: Bind move/up to STAGE to catch fast movements or outside releases
            if (stage) {
                stage.eventMode = 'static'; // Ensure stage can emit events
                // app.screen might change, but usually fine. 
                // Using 'static' allows stage to catch bubbling events from children, 
                // AND if we want to catch events on background, we might need hitArea.
                // For now, attaching to stage ensures we get the events as long as the mouse is over the canvas.
                stage.on('pointermove', onDragMove);
                stage.on('pointerup', onDragEnd);
                stage.on('pointerupoutside', onDragEnd);
            }
        };

        container.on('pointerdown', onDragStart);

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
    }, [app, stage, initialX, initialY, color, name, onAction, src, displayMode]);

    return null; // This component renders nothing in React DOM
};
