"use client";

import React from 'react';
import { PixiStage, usePixiApp } from '../test/PixiStage';
import { CollisionProvider } from '../test/CollisionSystem';
import { AmbienceLayer } from './layers/AmbienceLayer';
import { StageLayer } from './layers/StageLayer';
import { ActorLayer } from './layers/ActorLayer';
import { SceneManifest } from './types';

import { SnapshotHelper } from './SnapshotHelper';

interface SmartSceneProps {
    manifest: SceneManifest;
    onAction: (command: string) => void;
    width?: number;
    height?: number;
    displayMode?: 'normal' | 'mask';
    onSnapshot?: (dataUrl: string) => void;
    debugZones?: boolean;
    refreshTrigger?: number; // Version/Tick to force re-renders
}

// Helper to configure global stage properties
const StageSetup = () => {
    const { app } = usePixiApp();
    React.useEffect(() => {
        if (app && app.stage) {
            app.stage.sortableChildren = true;
        }
    }, [app]);
    return null;
};

export const SmartScene = ({ manifest, onAction, width = 800, height = 600, displayMode = 'normal', onSnapshot, debugZones = false, refreshTrigger = 0 }: SmartSceneProps) => {

    return (
        <PixiStage width={width} height={height}>
            <StageSetup />
            <CollisionProvider>

                {/* Layer 2: Actors (Zones + Entities) */}
                <ActorLayer assets={manifest.layers.actors} onAction={onAction} displayMode={displayMode} debugZones={debugZones} refreshTrigger={refreshTrigger} />

                {/* Layer 0: Ambience (Background) */}
                <AmbienceLayer assets={manifest.layers.ambience} width={width} height={height} displayMode={displayMode} />

                {/* Layer 1: Stage (The Board) */}
                {/* <StageLayer assets={manifest.layers.stage} width={width} height={height} /> */}

                {/* Helper for Snapshots */}
                {onSnapshot && (
                    <SnapshotHelper
                        shouldCapture={displayMode === 'mask'}
                        onCaptured={onSnapshot}
                    />
                )}

            </CollisionProvider>
        </PixiStage>
    );
};
