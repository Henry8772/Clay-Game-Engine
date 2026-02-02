"use client";

import React from 'react';
import { AssetManifest } from '../types';
import { DropZone } from '../../test/CollisionSystem';
import { GameEntity } from '../../test/GameEntity';

interface ActorLayerProps {
    assets: AssetManifest[];
    onAction: (cmd: string) => void;
    displayMode?: 'normal' | 'mask';
    debugZones?: boolean;
    refreshTrigger?: number;
}

export const ActorLayer = ({ assets, onAction, displayMode = 'normal', debugZones = false, refreshTrigger = 0 }: ActorLayerProps) => {

    return (
        <>
            {assets.map(asset => {
                if (asset.role === 'ZONE') {
                    return (
                        <DropZone
                            key={asset.id}
                            id={asset.id}
                            x={asset.initialState?.x || 0}
                            y={asset.initialState?.y || 0}
                            width={asset.config?.width || 100}
                            height={asset.config?.height || 100}
                            cellSize={asset.config?.cellSize || 0}
                            label={asset.id}
                            debugColor={asset.color ? parseInt(asset.color.replace('#', '0x')) : 0x333333}
                            displayMode={displayMode}
                            visible={debugZones || !!asset.config?.highlight}
                        />
                    );
                } else if (asset.role === 'SPRITE') {
                    // In Mask Mode, we only want layout (Zones), not entities (Cards)
                    if (displayMode === 'mask') return null;

                    return (
                        <GameEntity
                            key={`${asset.id}-${refreshTrigger}`}
                            id={asset.id}
                            name={asset.id} // Simple name for now
                            initialX={asset.initialState?.x || 0}
                            initialY={asset.initialState?.y || 0}
                            color={asset.color || 'white'}
                            src={asset.src}
                            onAction={onAction}
                            displayMode={displayMode}
                            config={asset.config}
                        />
                    );
                }
                return null;
            })}
        </>
    );
};
