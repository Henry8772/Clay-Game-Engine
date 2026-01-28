"use client";

import { useEffect } from 'react';
import { usePixiApp } from '../test/PixiStage';

interface SnapshotHelperProps {
    shouldCapture: boolean;
    onCaptured: (dataUrl: string) => void;
}

export const SnapshotHelper = ({ shouldCapture, onCaptured }: SnapshotHelperProps) => {
    const { app } = usePixiApp();

    useEffect(() => {
        if (!app || !shouldCapture) return;

        // Force a render to ensure the "mask" mode is drawn before capturing
        app.render();

        // Extract image
        const capture = async () => {
            try {
                const dataUrl = await app.renderer.extract.base64(app.stage);
                onCaptured(dataUrl);
            } catch (e) {
                console.error("Snapshot failed:", e);
            }
        };

        // Small delay or next tick often ensures the render is committed to the buffer
        requestAnimationFrame(capture);

    }, [app, shouldCapture, onCaptured]);

    return null;
};
