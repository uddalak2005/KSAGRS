import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { downloadTTSAudio } from "../utils/downloadTTS.util.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Language mapping for crops.json
const LANGUAGE_MAPPING = {
  "en-IN": "en",
  "hi-IN": "hi",
  "bn-IN": "bn",
  "te-IN": "te",
};

/**
 * Download TTS audio for all crop names
 */
async function downloadCropTTSFiles() {
  console.log("🚀 Starting Crop TTS audio download...");

  // Get the project root directory (two levels up from scripts)
  const projectRoot = path.resolve(__dirname, "..");
  const audioBasePath = path.join(projectRoot, "public", "audio");

  // Read crops.json
  const cropsPath = path.join(projectRoot, "utils", "crops.json");
  const crops = JSON.parse(fs.readFileSync(cropsPath, "utf8"));

  let successCount = 0;
  let totalCount = 0;

  for (const crop of crops) {
    for (const [languageCode, languageKey] of Object.entries(LANGUAGE_MAPPING)) {
      const cropName = crop[languageKey];
      const englishName = crop["en"] ? crop["en"].toUpperCase() : "";
      if (!cropName || !englishName) {
        console.warn(`⚠️ Missing crop name for language ${languageKey} or English for crop:`, crop);
        continue;
      }

      totalCount++;

      // Create language-specific crop_names directory
      const cropNamesDir = path.join(audioBasePath, languageCode, "crop_names");
      const outputFileName = `${cropName}_${englishName}.wav`;
      const outputPath = path.join(cropNamesDir, outputFileName);

      const success = await downloadTTSAudio(cropName, languageCode, outputPath);
      if (success) {
        successCount++;
      }

      // Add a small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n📊 Download Summary:`);
  console.log(`✅ Successful: ${successCount}/${totalCount}`);
  console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`);

  if (successCount === totalCount) {
    console.log("🎉 All crop TTS files downloaded successfully!");
  } else {
    console.log("⚠️ Some files failed to download. Check the errors above.");
  }
}

// Run the download
downloadCropTTSFiles()
  .then(() => {
    console.log("\n🎉 Crop TTS download script completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Crop TTS download script failed:", error);
    process.exit(1);
  });