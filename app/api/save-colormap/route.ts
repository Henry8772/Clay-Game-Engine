import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const { image } = await req.json();

        if (!image) {
            return NextResponse.json(
                { error: "Image data is required" },
                { status: 400 }
            );
        }

        // Prepare the path to save the file
        // We want to save it to: backend/test/real/ref_color_map.png
        // Process.cwd() in Next.js is usually the project root (features/game-as-image)
        const targetPath = path.resolve(
            process.cwd(),
            "backend/test/real/ref_color_map.png"
        );

        // Strip the data URL prefix (e.g., "data:image/png;base64,")
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Write the file
        fs.writeFileSync(targetPath, buffer);

        return NextResponse.json({ success: true, path: targetPath });
    } catch (error) {
        console.error("Error saving color map:", error);
        return NextResponse.json(
            { error: "Failed to save color map" },
            { status: 500 }
        );
    }
}
