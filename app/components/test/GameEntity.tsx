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
    const containerRef = useRef<PIXI.Container | null>(null);
    const isDragging = useRef(false);

    // Helper: Convert Pixels to Chess Notation (Mock)
    const getGridLocation = (x: number, y: number) => {
        const col = String.fromCharCode(65 + Math.floor(x / 100)); // 0-100 = A, 100-200 = B
        const row = Math.floor(y / 100) + 1;
        return `${col}${row}`;
    };

    useEffect(() => {
        if (!app || !stage) return;

        // 1. Create Container
        const container = new PIXI.Container();
        container.x = initialX;
        container.y = initialY;

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
            sprite.width = 100;
            sprite.height = 150; // Approximating card ratio
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
                const gridLoc = getGridLocation(container.x, container.y);
                onAction(`Move ${name} to ${gridLoc}`);

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
            onAction(`User picked up ${name}`);

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
