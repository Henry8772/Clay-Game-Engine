"use client";

import React, { createContext, useContext } from 'react';
import { usePixiApp } from '../test/PixiStage';
import { useCameraShake } from '../../hooks/useCameraShake';

interface FXContextType {
    shake: (intensity?: number) => void;
}

const FXContext = createContext<FXContextType | null>(null);

export const useFX = () => {
    const context = useContext(FXContext);
    if (!context) {
        // Fallback for when used outside provider or if FX disabled
        return { shake: () => { } };
    }
    return context;
};

export const FXProvider = ({ children }: { children: React.ReactNode }) => {
    const { stage } = usePixiApp();
    const { triggerShake } = useCameraShake(stage);

    const shake = (intensity: number = 5) => {
        triggerShake(intensity);
    };

    return (
        <FXContext.Provider value={{ shake }}>
            {children}
        </FXContext.Provider>
    );
};
