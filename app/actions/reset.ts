"use server";
import fs from "fs";
import path from "path";

const TEMPLATE_PATH = path.join(process.cwd(), "app", "generated", "templates", "EmptyGame.tsx");
const DEST_PATH = path.join(process.cwd(), "app", "generated", "game-slot.tsx");

export async function resetGameAction() {
    try {
        if (!fs.existsSync(TEMPLATE_PATH)) {
            return { success: false, error: "Template not found." };
        }
        fs.copyFileSync(TEMPLATE_PATH, DEST_PATH);
        return { success: true };
    } catch (e) {
        console.error("Error resetting game:", e);
        return { success: false, error: String(e) };
    }
}
