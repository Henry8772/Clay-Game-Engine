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
        layerContainer.zIndex = 0; // Layer 0 (Bottom)

        // Ambient Backgrounds are "COVER" scaled
        assets.forEach(asset => {
            if (!asset.src) return;

            const sprite = new PIXI.Sprite();
            sprite.anchor.set(0.5);
            sprite.x = width / 2;
            sprite.y = height / 2;

            layerContainer.addChild(sprite);

            PIXI.Assets.load(asset.src).then(texture => {
                if (!sprite.destroyed) {
                    sprite.texture = texture;

                    // "Cover" Scale Logic
                    if (texture && texture.width > 0 && texture.height > 0) {
                        const scale = Math.max(width / texture.width, height / texture.height);
                        sprite.scale.set(scale);
                    }
                }
            }).catch(err => {
                console.error(`Ambience failed to load: ${asset.src}`, err);
                if (!sprite.destroyed) {
                    sprite.visible = false; // Hide if failed
                }
            });
        });

        stage.addChildAt(layerContainer, 0); // Layer 0: Bottom

        return () => {
            if (stage && !stage.destroyed) {
                stage.removeChild(layerContainer);
            }
            if (!layerContainer.destroyed) {
                layerContainer.destroy({ children: true });
            }
        };
    }, [app, stage, assets, width, height]);

    return null;
};
