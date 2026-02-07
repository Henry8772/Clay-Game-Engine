"use client";

import * as PIXI from 'pixi.js';
import React, { useEffect, useRef } from 'react';
import { usePixiApp } from '../test/PixiStage';
import { useCollision } from '../test/CollisionSystem';
import { lerp, clamp } from '../../hooks/useGamePhysics';
import { useFX } from './FXSystem';

interface GameSpriteProps {
    id: string;
    name: string;
    initialX: number;
    initialY: number;
    color: string | number;
    src?: string;
    onAction: (command: string) => void;
    displayMode?: 'normal' | 'mask';
    config?: any;
    debugZones?: boolean;
}

// Visual Constants
const LERP_FACTOR = 0.25;
const MAX_TILT = 0.15;
const VELOCITY_TILT_MODIFIER = 0.005;
const HOVER_SCALE = 1.15;
const HOVER_Y_OFFSET = -10;
const SHADOW_OFFSET_X = 0;
const SHADOW_OFFSET_Y = 20;

export const GameSprite = ({ id, name, initialX, initialY, color, src, onAction, displayMode = 'normal', config }: GameSpriteProps) => {
    const { app, stage } = usePixiApp();
    const { getZoneAt, getEntityAt, registerEntity, unregisterEntity } = useCollision();
    const { shake } = useFX();

    // -- Physics State Refs --
    const renderPos = useRef({ x: initialX, y: initialY });
    const targetPos = useRef({ x: initialX, y: initialY });
    const isHeld = useRef(false);
    const pickupOffset = useRef({ x: 0, y: 0 });
    const dragStartZone = useRef<string | null>(null);

    // -- Pixi Objects --
    const containerRef = useRef<PIXI.Container | null>(null);
    const spriteRef = useRef<PIXI.Sprite | null>(null);
    const shadowRef = useRef<PIXI.Graphics | null>(null);
    const contentRef = useRef<PIXI.Container | null>(null);

    useEffect(() => {
        if (!app || !stage) return;

        // 1. Build Visual Hierarchy
        const container = new PIXI.Container();
        container.x = initialX;
        container.y = initialY;
        container.zIndex = 2;
        container.sortableChildren = true;

        // Shadow
        const shadow = new PIXI.Graphics();
        shadow.beginFill(0x000000, 0.3);
        shadow.drawEllipse(0, 0, 25, 10);
        shadow.endFill();
        shadow.filters = [new PIXI.BlurFilter(5)];
        shadow.y = 0;
        shadow.alpha = 0;
        container.addChild(shadow);
        shadowRef.current = shadow;

        // Content Container
        const content = new PIXI.Container();
        content.zIndex = 1;
        container.addChild(content);
        contentRef.current = content;

        // Visuals
        if (displayMode === 'mask') {
            const graphics = new PIXI.Graphics();
            graphics.beginFill(color);
            graphics.drawRect(-50, -75, 100, 150);
            graphics.endFill();
            content.addChild(graphics);
        } else if (src) {
            PIXI.Assets.load(src).then(texture => {
                if (content.destroyed) return;
                const sprite = new PIXI.Sprite(texture);
                sprite.anchor.set(0.5, 0.5);

                // --- FIX STARTS HERE ---

                // 1. Check for Explicit Scale in Config (This is what you are sending from PlayPage)
                if (config?.scale) {
                    if (typeof config.scale === 'object') {
                        // Handle {x: 0.25, y: 0.25}
                        sprite.scale.set(config.scale.x, config.scale.y);
                    } else if (typeof config.scale === 'number') {
                        // Handle single number 0.25
                        sprite.scale.set(config.scale);
                    }
                }
                // 2. Fallback to explicit Width/Height if provided
                else if (config?.width && config?.height) {
                    sprite.width = config.width;
                    sprite.height = config.height;
                }
                // 3. Otherwise, do nothing. Leave it at native texture size (1:1)

                // --- FIX ENDS HERE ---

                content.addChild(sprite);
                spriteRef.current = sprite;
            }).catch(err => {
                console.warn(`Failed to load asset: ${src}`, err);
                const graphics = new PIXI.Graphics();
                graphics.lineStyle(2, 0xFF0000);
                graphics.beginFill(0x330000);
                graphics.drawRect(-30, -30, 60, 60);
                graphics.endFill();
                content.addChild(graphics);
            });
        } else {
            const graphics = new PIXI.Graphics();
            graphics.beginFill(color);
            graphics.drawCircle(0, 0, 30);
            graphics.endFill();
            content.addChild(graphics);
        }

        // Enable Interactivity
        container.eventMode = 'static';
        container.cursor = 'pointer';

        registerEntity(id, { id, container, role: 'SPRITE' });

        // 2. The Physics Loop (Ticker)
        const updateTicker = (delta: number) => {
            if (container.destroyed) return;

            const lastX = renderPos.current.x;
            const newX = lerp(renderPos.current.x, targetPos.current.x, LERP_FACTOR);
            const newY = lerp(renderPos.current.y, targetPos.current.y, LERP_FACTOR);

            renderPos.current = { x: newX, y: newY };
            container.x = newX;
            container.y = newY;

            const velX = newX - lastX;

            // Apply Tilt
            if (content) {
                const targetRotation = clamp(velX * VELOCITY_TILT_MODIFIER, -MAX_TILT, MAX_TILT);
                content.rotation = lerp(content.rotation, targetRotation, 0.2);
            }

            // Visual State Logic
            if (isHeld.current) {
                // HOVER STATE
                // Note: We modify content.scale here for the "Pop" effect.
                // This Multiplies with the base sprite scale set above.
                content.scale.x = lerp(content.scale.x, HOVER_SCALE, 0.2);
                content.scale.y = lerp(content.scale.y, HOVER_SCALE, 0.2);
                content.y = lerp(content.y, HOVER_Y_OFFSET, 0.2);

                shadow.alpha = lerp(shadow.alpha, 0.6, 0.1);
                shadow.scale.x = lerp(shadow.scale.x, 0.8, 0.1);
                shadow.scale.y = lerp(shadow.scale.y, 0.8, 0.1);
                shadow.y = SHADOW_OFFSET_Y;
                container.zIndex = 100;
            } else {
                // IDLE STATE
                content.scale.x = lerp(content.scale.x, 1.0, 0.2);
                content.scale.y = lerp(content.scale.y, 1.0, 0.2);
                content.y = lerp(content.y, 0, 0.2);

                shadow.alpha = lerp(shadow.alpha, 0, 0.2);
                shadow.y = 0;
                container.zIndex = 2;
            }
        };

        app.ticker.add(updateTicker);

        // -- Event Handlers --
        const onPickup = (e: PIXI.FederatedPointerEvent) => {
            isHeld.current = true;
            const globalPos = e.global;
            pickupOffset.current = {
                x: globalPos.x - targetPos.current.x,
                y: globalPos.y - targetPos.current.y
            };
            const startZone = getZoneAt(container.x, container.y);
            dragStartZone.current = startZone ? startZone.id : null;

            const pickupEvent = JSON.stringify({
                type: 'PICK_UP',
                entity: name,
                entityId: id,
                entityConfig: config,
                from: dragStartZone.current
            });
            onAction(pickupEvent);

            if (stage) {
                stage.eventMode = 'static';
                stage.on('pointermove', onDragMove);
                stage.on('pointerup', onRelease);
                stage.on('pointerupoutside', onRelease);
            }
        };

        const onDragMove = (e: PIXI.FederatedPointerEvent) => {
            if (!isHeld.current) return;
            const globalPos = e.global;
            targetPos.current = {
                x: globalPos.x - pickupOffset.current.x,
                y: globalPos.y - pickupOffset.current.y
            };
        };

        const onRelease = (e: PIXI.FederatedPointerEvent) => {
            if (!isHeld.current) return;
            isHeld.current = false;

            const dropZone = getZoneAt(container.x, container.y);
            const toId = dropZone ? dropZone.id : null;
            const fromId = dragStartZone.current;
            const targetEntity = getEntityAt(container.x, container.y, id);
            const isAttack = !!targetEntity;

            console.log(`GameSprite ${name}: Dropped at`, { x: container.x, y: container.y, zone: toId });

            if (toId && dropZone) {
                if (isAttack && targetEntity) {
                    shake(5);
                    const dirX = targetEntity.container.x - container.x;
                    const dirY = targetEntity.container.y - container.y;
                    targetPos.current = {
                        x: targetEntity.container.x + (dirX * 0.2),
                        y: targetEntity.container.y + (dirY * 0.2)
                    };
                    setTimeout(() => {
                        if (!container.destroyed) {
                            targetPos.current = { x: initialX, y: initialY };
                        }
                    }, 150);
                } else {
                    targetPos.current = {
                        x: dropZone.container.x + dropZone.container.width / 2,
                        y: dropZone.container.y + dropZone.container.height / 2
                    };
                }
            } else {
                targetPos.current = { x: initialX, y: initialY };
            }

            const event = JSON.stringify({
                type: isAttack ? 'ATTACK' : 'MOVE',
                entity: name,
                entityId: id,
                targetId: isAttack ? targetEntity?.id : undefined,
                from: fromId,
                to: toId
            });
            onAction(event);

            if (stage) {
                stage.off('pointermove', onDragMove);
                stage.off('pointerup', onRelease);
                stage.off('pointerupoutside', onRelease);
            }
        }

        container.on('pointerdown', onPickup);

        stage.addChild(container);
        containerRef.current = container;

        return () => {
            unregisterEntity(id);
            if (app) {
                app.ticker.remove(updateTicker);
            }
            if (stage) {
                stage.off('pointermove', onDragMove);
                stage.off('pointerup', onRelease);
                stage.off('pointerupoutside', onRelease);
                stage.removeChild(container);
            }
            container.destroy({ children: true });
        };

    }, [app, stage, id, name, onAction, src, displayMode, JSON.stringify(config)]);

    useEffect(() => {
        if (!isHeld.current) {
            targetPos.current = { x: initialX, y: initialY };
        }
    }, [initialX, initialY]);

    return null;
};