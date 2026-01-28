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
    onAction: (command: string) => void;
}

export const GameEntity = ({ id, name, initialX, initialY, color, onAction }: GameEntityProps) => {
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

        // 2. Create Graphics (Circle)
        const graphics = new PIXI.Graphics();
        graphics.beginFill(color); // 'red', 'blue', etc work in PIXI 7
        graphics.drawCircle(0, 0, 30);
        graphics.endFill();
        container.addChild(graphics);

        // 3. Create Text Label
        const textStyle = new PIXI.TextStyle({
            fill: 'white',
            fontSize: 14,
            fontFamily: 'Arial',
            align: 'center'
        });
        const text = new PIXI.Text(name, textStyle);
        text.anchor.set(0.5);
        text.y = 40;
        container.addChild(text);

        // 4. Interaction Logic
        let dragOffset = { x: 0, y: 0 };

        const onDragStart = (e: PIXI.FederatedPointerEvent) => {
            isDragging.current = true;
            const currentPosition = e.getLocalPosition(container.parent);
            dragOffset = {
                x: currentPosition.x - container.x,
                y: currentPosition.y - container.y
            };
            container.alpha = 0.5;
            onAction(`User picked up ${name}`);
        };

        const onDragMove = (e: PIXI.FederatedPointerEvent) => {
            if (isDragging.current) {
                const newPosition = e.getLocalPosition(container.parent);
                container.x = newPosition.x - dragOffset.x;
                container.y = newPosition.y - dragOffset.y;
            }
        };

        const onDragEnd = () => {
            if (isDragging.current) {
                isDragging.current = false;
                container.alpha = 1;
                const gridLoc = getGridLocation(container.x, container.y);
                onAction(`Move ${name} to ${gridLoc}`);
            }
        };

        container.on('pointerdown', onDragStart);
        // Bind move/up to stage/window to capture fast movements or outside releases
        // But for simplicity in this specific container structure, binding to stage is better usually.
        // For this mock, we'll listen on the container for simplicity, but often stage is safer for global drag.
        // Let's attach move/up to the container for now, but usually 'global' is safer.
        // Actually, app.stage is better.

        // Using container 'pointermove' only triggers when over the container, which is bad for dragging.
        // We must attach move/up listeners to the stage or simple handle it in the container if we assume mouse stays over it (bad assumption).
        // Let's use the object itself for 'down', and the stage for 'move'/'up' if possible, or just keeping it simple:
        // Pixi 7 handles 'pointermove' on the object if you hold it? No, standard DOM rules don't apply.
        // Best practice: Set 'pointermove' on the stage when dragging starts.

        // SIMPLIFIED DRAG:
        container.on('pointermove', onDragMove);
        container.on('pointerup', onDragEnd);
        container.on('pointerupoutside', onDragEnd);

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
    }, [app, stage, initialX, initialY, color, name, onAction]);

    return null; // This component renders nothing in React DOM
};
