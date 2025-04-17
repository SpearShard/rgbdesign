const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const imagesDir = path.resolve("public/images"); // Ensure absolute path
const outputFile = path.resolve("public/images.json");

// Load existing uploaded URLs
let uploadedImages = {};
if (fs.existsSync(outputFile)) {
    uploadedImages = JSON.parse(fs.readFileSync(outputFile, "utf8"));
}

// Upload only .webp images
fs.readdir(imagesDir, (err, files) => {
    if (err) return console.error("Error reading directory:", err);

    files.forEach((file) => {
        if (!file.endsWith(".webp")) return; // Skip non-WebP files
        if (uploadedImages[file]) {
            console.log(`✅ Already uploaded: ${file}`);
            return;
        }

        const filePath = path.join(imagesDir, file);

        // Fix: Use correct path format and ensure correct execution
        exec(`vercel blob put "${filePath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error uploading ${file}:`, stderr || error);
                return;
            }

            const imageUrl = stdout.trim();
            uploadedImages[file] = imageUrl;
            console.log(`✅ Uploaded ${file}: ${imageUrl}`);

            fs.writeFileSync(outputFile, JSON.stringify(uploadedImages, null, 2));
        });
    });
});
