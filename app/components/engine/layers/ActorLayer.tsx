"use client";

import React from 'react';
import { AssetManifest } from '../types';
import { DropZone } from '../../test/CollisionSystem';
import { GameEntity } from '../../test/GameEntity';

interface ActorLayerProps {
    assets: AssetManifest[];
    onAction: (cmd: string) => void;
}

export const ActorLayer = ({ assets, onAction }: ActorLayerProps) => {

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
                        />
                    );
                } else if (asset.role === 'SPRITE') {
                    return (
                        <GameEntity
                            key={asset.id}
                            id={asset.id}
                            name={asset.id} // Simple name for now
                            initialX={asset.initialState?.x || 0}
                            initialY={asset.initialState?.y || 0}
                            color={asset.color || 'white'}
                            onAction={onAction}
                        />
                    );
                }
                return null;
            })}
        </>
    );
};
