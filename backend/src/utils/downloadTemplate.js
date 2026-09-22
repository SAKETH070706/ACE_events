import fs from "fs/promises";
import path from "path";

export const downloadTemplate = async (templateUrl) => {
    try {

        // Download image from Cloudinary
        const response = await fetch(templateUrl);

        if (!response.ok) {
            throw new Error("Failed to download template.");
        }

        // Convert to Buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Create temp directory if it doesn't exist
        const tempDir = path.join(
            process.cwd(),
            "src",
            "temp"
        );

        await fs.mkdir(tempDir, {
            recursive: true
        });

        // Unique filename
        const fileName = `template-${Date.now()}.png`;

        const filePath = path.join(
            tempDir,
            fileName
        );

        // Save locally
        await fs.writeFile(filePath, buffer);

        return filePath;

    } catch (error) {
        throw new Error(
            `Failed to download template: ${error.message}`
        );
    }
};