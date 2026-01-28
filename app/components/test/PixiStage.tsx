"use client";

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

type PixiContextType = {
    app: PIXI.Application<HTMLCanvasElement> | null;
    stage: PIXI.Container | null;
};

const PixiContext = createContext<PixiContextType>({ app: null, stage: null });

export const usePixiApp = () => useContext(PixiContext);

interface PixiStageProps {
    width: number;
    height: number;
    backgroundColor?: number;
    children?: React.ReactNode;
}

export const PixiStage = ({ width, height, backgroundColor = 0x000000, children }: PixiStageProps) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [app, setApp] = useState<PIXI.Application<HTMLCanvasElement> | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize Pixi App
        const newApp = new PIXI.Application<HTMLCanvasElement>({
            width,
            height,
            backgroundColor,
            antialias: true,
            backgroundAlpha: 0, // Make transparent so we see the parent div bg
        });

        canvasRef.current.appendChild(newApp.view);
        setApp(newApp);

        return () => {
            newApp.destroy(true, { children: true });
        };
    }, [width, height, backgroundColor]);

    return (
        <div ref={canvasRef} style={{ width, height }}>
            <PixiContext.Provider value={{ app, stage: app?.stage || null }}>
                {app ? children : null}
            </PixiContext.Provider>
        </div>
    );
};
