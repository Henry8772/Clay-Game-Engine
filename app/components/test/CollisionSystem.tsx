"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { usePixiApp } from './PixiStage';

// --- Types ---

export interface ZoneData {
    id: string;
    container: PIXI.Container;
    // The zone can define how to translate a point to a semantic value (e.g. "A1")
    resolveLocation?: (globalX: number, globalY: number) => string | null;
}

export interface EntityData {
    id: string;
    container: PIXI.Container;
    role: 'SPRITE' | 'ZONE'; // Differentiate
}

interface CollisionContextType {
    registerZone: (id: string, zone: ZoneData) => void;
    unregisterZone: (id: string) => void;
    getZoneAt: (globalX: number, globalY: number) => ZoneData | null;
    registerEntity: (id: string, entity: EntityData) => void;
    unregisterEntity: (id: string) => void;
    getEntityAt: (globalX: number, globalY: number, excludeId?: string) => EntityData | null;
}

// --- Context ---

const CollisionContext = createContext<CollisionContextType | null>(null);

export const useCollision = () => {
    const context = useContext(CollisionContext);
    if (!context) {
        throw new Error("useCollision must be used within a CollisionProvider");
    }
    return context;
};

// --- Provider ---

export const CollisionProvider = ({ children }: { children: React.ReactNode }) => {
    const zones = useRef<Map<string, ZoneData>>(new Map());
    const entities = useRef<Map<string, EntityData>>(new Map());

    const registerZone = (id: string, zone: ZoneData) => {
        zones.current.set(id, zone);
    };

    const unregisterZone = (id: string) => {
        zones.current.delete(id);
    };

    const registerEntity = (id: string, entity: EntityData) => {
        entities.current.set(id, entity);
    }
    const unregisterEntity = (id: string) => {
        entities.current.delete(id);
    }

    const getZoneAt = (globalX: number, globalY: number) => {
        for (const zone of Array.from(zones.current.values()).reverse()) {
            const bounds = zone.container.getBounds();
            if (GlobalBoundsContains(bounds, globalX, globalY)) {
                return zone;
            }
        }
        return null;
    };

    const getEntityAt = (globalX: number, globalY: number, excludeId?: string) => {
        for (const entity of Array.from(entities.current.values()).reverse()) {
            if (excludeId && entity.id === excludeId) continue;

            // Check if bounds valid (container not destroyed)
            if (entity.container.destroyed) continue;

            const bounds = entity.container.getBounds();
            if (GlobalBoundsContains(bounds, globalX, globalY)) {
                return entity;
            }
        }
        return null;
    }

    // Helper for simple rect check
    const GlobalBoundsContains = (bounds: PIXI.Rectangle, x: number, y: number) => {
        return x >= bounds.x && x <= bounds.x + bounds.width &&
            y >= bounds.y && y <= bounds.y + bounds.height;
    }

    return (
        <CollisionContext.Provider value={{ registerZone, unregisterZone, getZoneAt, registerEntity, unregisterEntity, getEntityAt }}>
            {children}
        </CollisionContext.Provider>
    );
};

// --- Components ---

interface DropZoneProps {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    debugColor?: number; // Visual aid
    cellSize?: number; // For grid math
    label?: string;
    onDrop?: (location: string) => void; // Optional callback if zone handles logic directly
    displayMode?: 'normal' | 'mask';
    visible?: boolean;
}

export const DropZone = ({ id, x, y, width, height, debugColor = 0x222222, cellSize = 100, label, displayMode = 'normal', visible = true }: DropZoneProps) => {
    const { app, stage } = usePixiApp();
    const { registerZone, unregisterZone } = useCollision();

    useEffect(() => {
        if (!app || !stage) return;

        const container = new PIXI.Container();
        container.x = x;
        container.y = y;
        container.zIndex = 1; // Layer 1 (Middle - Zones)

        // Visibility control: We use alpha 0 so it's hidden but still has dimensions for getBounds()
        container.alpha = visible ? 1 : 0;

        // Draw Zone Visuals
        const g = new PIXI.Graphics();

        if (displayMode === 'mask') {
            // Solid Opaque for Mask
            g.beginFill(debugColor, 1.0);
            g.drawRect(0, 0, width, height);
            g.endFill();
        } else {
            // --- MINIMALIST STYLE ---

            // 1. Clean, Consistent Fill
            g.beginFill(debugColor, 0.1);
            g.drawRect(0, 0, width, height);
            g.endFill();

            // 2. Simple, Elegant Border
            g.lineStyle(1, debugColor, 0.6);
            g.drawRect(0, 0, width, height);

            // 3. (Optional) Highlight top edge for subtle 3D feel
            g.lineStyle(2, debugColor, 0.8);
            g.moveTo(0, 0);
            g.lineTo(width, 0);
        }
        container.addChild(g);


        if (label && displayMode === 'normal') {
            // Clean Label
            const text = new PIXI.Text(label, {
                fontFamily: 'Arial',
                fill: debugColor,
                fontSize: 10,
                fontWeight: 'normal', // Lighter weight
                letterSpacing: 0.5
            });
            text.x = 5;
            text.y = 5;
            text.alpha = 0.9;
            container.addChild(text);
        }

        stage.addChildAt(container, 0); // Add to back

        // Registration
        const zoneData: ZoneData = {
            id,
            container,
            resolveLocation: (gx, gy) => {
                // "Smart Zone" Logic: Convert Global -> Local -> Grid
                // Pixi handles the matrix transform (Global to Local)
                const local = container.toLocal(new PIXI.Point(gx, gy));

                // Grid Math: Encapsulated here!
                const colIndex = Math.floor(local.x / cellSize);
                const rowIndex = Math.floor(local.y / cellSize);

                const colChar = String.fromCharCode(65 + colIndex); // A, B, C...
                const rowNum = rowIndex + 1; // 1, 2, 3...

                // Boundary Check (optional, though getZoneAt already checked bounds roughly)
                if (local.x < 0 || local.y < 0 || local.x > width || local.y > height) return null;

                return `${colChar}${rowNum}`;
            }
        };

        registerZone(id, zoneData);

        return () => {
            unregisterZone(id);
            if (stage && !stage.destroyed) {
                stage.removeChild(container);
            }
            if (!container.destroyed) {
                container.destroy({ children: true });
            }
        };
    }, [app, stage, x, y, width, height, cellSize, id, registerZone, unregisterZone, displayMode, visible, debugColor, label]);

    return null;
};
