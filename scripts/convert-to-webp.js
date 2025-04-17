const sharp = require("sharp");
const fs = require("fs-extra");
const path = require("path");

const baseDir = "./public/images"; // Root directory for images

// Recursively process all files in the directory
const processImages = (dir) => {
    fs.readdirSync(dir).forEach((file) => {
        const fullPath = path.join(dir, file);

        // Check if it's a directory, then process recursively
        if (fs.statSync(fullPath).isDirectory()) {
            processImages(fullPath);
        } else if (/\.(jpg|jpeg|png)$/i.test(file)) { // Convert only image files
            const outputFileName = file.replace(/\.(jpg|jpeg|png)$/, ".webp");
            const outputPath = path.join(dir, outputFileName);

            sharp(fullPath)
                .toFormat("webp", { quality: 80 }) // Adjust quality if needed
                .toFile(outputPath)
                .then(() => console.log(`✅ Converted: ${file} → ${outputFileName}`))
                .catch((err) => console.error(`❌ Error converting ${file}:`, err));
        }
    });
};

// Start processing from the base directory
processImages(baseDir);

console.log("🎉 All images have been converted to WebP!");
