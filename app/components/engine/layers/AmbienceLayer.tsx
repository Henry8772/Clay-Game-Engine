"use client";

import * as PIXI from 'pixi.js';
import React, { useEffect, useState } from 'react';
import { usePixiApp } from '../../test/PixiStage';
import { AssetManifest } from '../types';

interface AmbienceLayerProps {
    assets: AssetManifest[];
    width: number;
    height: number;
}

export const AmbienceLayer = ({ assets, width, height }: AmbienceLayerProps) => {
    const { app, stage } = usePixiApp();

    useEffect(() => {
        if (!app || !stage || assets.length === 0) return;

        const layerContainer = new PIXI.Container();
        layerContainer.sortableChildren = true;

        // Ambient Backgrounds are "COVER" scaled
        assets.forEach(asset => {
            const sprite = PIXI.Sprite.from(asset.src || PIXI.Texture.WHITE);
            if (!asset.src && asset.color) {
                // Mock texture if no src
                const g = new PIXI.Graphics();
                g.beginFill(asset.color);
                g.drawRect(0, 0, 100, 100);
                g.endFill();
                sprite.texture = app.renderer.generateTexture(g);
            }

            sprite.anchor.set(0.5);
            sprite.x = width / 2;
            sprite.y = height / 2;

            // COVER Logic
            // We want the image to cover the screen entirely, maintaining aspect ratio
            // mock loading check
            const texture = sprite.texture;
            if (texture.baseTexture.valid) {
                const scale = Math.max(width / texture.width, height / texture.height);
                sprite.scale.set(scale);
            } else {
                texture.once('update', () => {
                    const scale = Math.max(width / texture.width, height / texture.height);
                    sprite.scale.set(scale);
                });
            }

            // Slight Blur for depth
            const blur = new PIXI.BlurFilter(4);
            sprite.filters = [blur];

            layerContainer.addChild(sprite);
        });

        stage.addChildAt(layerContainer, 0); // Layer 0: Bottom

        // Parallax Effect (Simple Mouse Follow)
        const onMouseMove = (e: MouseEvent) => {
            const moveX = (e.clientX - window.innerWidth / 2) * 0.02;
            const moveY = (e.clientY - window.innerHeight / 2) * 0.02;
            layerContainer.x = -moveX;
            layerContainer.y = -moveY;
        };
        window.addEventListener('mousemove', onMouseMove);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            stage.removeChild(layerContainer);
            layerContainer.destroy({ children: true });
        };
    }, [app, stage, assets, width, height]);

    return null;
};
