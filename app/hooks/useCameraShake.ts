
import { useRef, useEffect, useState } from 'react';
import * as PIXI from 'pixi.js';

export const useCameraShake = (stage: PIXI.Container | null) => {
    const shakeIntensity = useRef(0);
    const shakeDecay = useRef(0.9); // How fast it settles

    const triggerShake = (intensity: number = 5) => {
        shakeIntensity.current = intensity;
    };

    useEffect(() => {
        if (!stage) return;

        let requestId: number;
        const initialX = stage.x;
        const initialY = stage.y;

        const update = () => {
            if (shakeIntensity.current > 0.5) {
                const dx = (Math.random() - 0.5) * shakeIntensity.current;
                const dy = (Math.random() - 0.5) * shakeIntensity.current;

                stage.x = initialX + dx;
                stage.y = initialY + dy;

                shakeIntensity.current *= shakeDecay.current;
            } else {
                // Snap back
                if (stage.x !== initialX || stage.y !== initialY) {
                    stage.x = initialX;
                    stage.y = initialY;
                    shakeIntensity.current = 0;
                }
            }
            requestId = requestAnimationFrame(update);
        };

        update();

        return () => cancelAnimationFrame(requestId);
    }, [stage]);

    return { triggerShake };
};
