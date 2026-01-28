"use client";

import * as PIXI from 'pixi.js';
import React, { useEffect } from 'react';
import { usePixiApp } from '../../test/PixiStage';
import { AssetManifest } from '../types';

interface StageLayerProps {
    assets: AssetManifest[];
    width: number;
    height: number;
}

export const StageLayer = ({ assets, width, height }: StageLayerProps) => {
    const { app, stage } = usePixiApp();

    useEffect(() => {
        if (!app || !stage || assets.length === 0) return;

        const layerContainer = new PIXI.Container();

        assets.forEach(asset => {
            // For the Board/Stage, we typically want "FIT" scaling (contain within screen with padding)
            const sprite = PIXI.Sprite.from(asset.src || PIXI.Texture.WHITE);

            if (!asset.src && asset.color) {
                const g = new PIXI.Graphics();
                g.beginFill(asset.color);
                g.drawRect(0, 0, 800, 600); // Mock Board Size
                g.endFill();
                sprite.texture = app.renderer.generateTexture(g);
            }

            sprite.anchor.set(0.5);
            sprite.x = width / 2;
            sprite.y = height / 2;

            // CONTAINER_FIT Logic (Smaller to show ambience)
            const applyScale = () => {
                if (sprite.destroyed) return;
                // Original usage was sprite.width/height which changes as we scale.
                // Better to use texture dimensions for calculation base or reset scale.
                sprite.scale.set(1);
                const texW = sprite.width;
                const texH = sprite.height;

                const targetW = width * 0.95; // Increased to fill more width
                const targetH = height * 0.9; // Increased to fill more height

                const scale = Math.min(targetW / texW, targetH / texH);
                sprite.scale.set(scale);
            };

            if (sprite.texture.baseTexture.valid) {
                applyScale();
            } else {
                sprite.texture.once('update', applyScale);
            }

            // Shadow for separation
            // Pixi doesn't have CSS box-shadow, but we can simulate or use DropShadowFilter (if installed)
            // For now, simpler visual
            sprite.alpha = 1;

            layerContainer.addChild(sprite);
        });

        stage.addChildAt(layerContainer, 1); // Layer 1: Above Ambience

        return () => {
            stage.removeChild(layerContainer);
            layerContainer.destroy({ children: true });
        };
    }, [app, stage, assets, width, height]);

    return null;
};
