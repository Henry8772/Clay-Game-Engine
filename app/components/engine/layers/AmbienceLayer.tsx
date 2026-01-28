"use client";

import * as PIXI from 'pixi.js';
import React, { useEffect, useState } from 'react';
import { usePixiApp } from '../../test/PixiStage';
import { AssetManifest } from '../types';

interface AmbienceLayerProps {
    assets: AssetManifest[];
    width: number;
    height: number;
    displayMode?: 'normal' | 'mask';
}

export const AmbienceLayer = ({ assets, width, height, displayMode = 'normal' }: AmbienceLayerProps) => {
    const { app, stage } = usePixiApp();

    useEffect(() => {
        if (!app || !stage || assets.length === 0) return;

        const layerContainer = new PIXI.Container();
        layerContainer.sortableChildren = true;

        // Ambient Backgrounds are "COVER" scaled
        assets.forEach(asset => {
            let sprite: PIXI.Sprite;

            if (displayMode === 'mask') {
                const g = new PIXI.Graphics();

                // 1. Fill with slightly lower alpha (so AI can add texture easier)
                // Use the defined color, or fallback
                const color = asset.color ? parseInt(asset.color.replace('#', '0x')) : 0x000000;
                g.beginFill(color, 0.9);

                // Draw the rect
                g.drawRect(0, 0, width, height);
                g.endFill();

                sprite = new PIXI.Sprite(app.renderer.generateTexture(g));
            } else {
                // NORMAL MODE
                sprite = PIXI.Sprite.from(asset.src || PIXI.Texture.WHITE);
                if (!asset.src && asset.color) {
                    // Mock texture if no src
                    const g = new PIXI.Graphics();
                    g.beginFill(asset.color);
                    g.drawRect(0, 0, 100, 100);
                    g.endFill();
                    sprite.texture = app.renderer.generateTexture(g);
                }
            }

            sprite.anchor.set(0.5);
            sprite.x = width / 2;
            sprite.y = height / 2;

            // FIT Logic (Contain)
            // We want the image to fit the screen entirely, maintaining aspect ratio
            const texture = sprite.texture;
            const applyScale = () => {
                if (sprite.destroyed) return;

                // FIX: Change Math.min to Math.max for "Cover" style
                const scale = Math.max(width / texture.width, height / texture.height);

                sprite.scale.set(scale);
            };

            if (texture.baseTexture.valid) {
                applyScale();
            } else {
                texture.once('update', applyScale);
            }

            // Slight Blur for depth - removed as per request for "clean" background
            // sprite.filters = [blur]; 

            // Actually, user wants it clear if it's the main board
            sprite.filters = [];

            layerContainer.addChild(sprite);
        });

        stage.addChildAt(layerContainer, 0); // Layer 0: Bottom

        return () => {
            stage.removeChild(layerContainer);
            layerContainer.destroy({ children: true });
        };
    }, [app, stage, assets, width, height, displayMode]);

    return null;
};
