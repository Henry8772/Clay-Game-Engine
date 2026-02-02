
export const lerp = (start: number, end: number, t: number) => {
    return start * (1 - t) + end * t;
};

export const lerpPoint = (p1: { x: number, y: number }, p2: { x: number, y: number }, t: number) => {
    return {
        x: lerp(p1.x, p2.x, t),
        y: lerp(p1.y, p2.y, t)
    };
};

export const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
