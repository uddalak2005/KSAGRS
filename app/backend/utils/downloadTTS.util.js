import { SarvamAIClient } from "sarvamai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { pathToFileURL } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read prompts.json file
const promptsPath = path.join(__dirname, "prompts.json");
const prompts = JSON.parse(readFileSync(promptsPath, "utf8"));

// Sarvam AI Client configuration
let sarvamClient = null;
try {
  sarvamClient = new SarvamAIClient({
    apiSubscriptionKey: process.env.SARVAM_API_KEY || "your-sarvam-api-key",
  });
} catch (e) {
  console.warn("Failed to initialize Sarvam AI client:", e.message);
}

// Language to speaker mapping for Bulbul v3
const LANGUAGE_SPEAKERS = {
  "en-IN": "simran",
  "hi-IN": "pooja",
  "bn-IN": "suhani",
  "te-IN": "ritu",
};

/**
 * Create directory if it doesn't exist
 * @param {string} dirPath - Directory path to create
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

/**
 * Download TTS audio for a single text
 * @param {string} text - Text to convert to speech
 * @param {string} language - Language code (e.g., 'hi-IN')
 * @param {string} outputPath - Output file path
 * @returns {Promise<boolean>} - Success status
 */
async function downloadTTSAudio(text, language, outputPath) {
  try {
    const isGoogle = process.env.AI_PROVIDER === "google";
    let audioBuffer;

    if (isGoogle) {
      console.log(`[Google Gemini TTS] Generating TTS for: "${text}" in language: ${language}`);
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
      
      // Try gemini-3.1-flash-tts-preview first, fallback to gemini-1.5-flash
      const modelsToTry = ["gemini-3.1-flash-tts-preview", "gemini-1.5-flash"];
      let base64Audio = null;
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent({
            contents: [{ 
              role: "user", 
              parts: [{ 
                text: `You are an expert Text-to-Speech voice artist. Please read aloud the following text in ${language} language. Return ONLY the spoken audio stream, with no introductory, supplementary or concluding commentary: "${text}"` 
              }] 
            }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    // Try to map a suitable default voice
                    voiceName: language.startsWith("hi") || language.startsWith("bn") || language.startsWith("te") ? "Aoede" : "Puck"
                  }
                }
              }
            }
          });

          const response = await result.response;
          const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          if (part && part.inlineData && part.inlineData.data) {
            base64Audio = part.inlineData.data;
            console.log(`[Google Gemini TTS] Successfully generated audio using model ${modelName}`);
            break;
          }
        } catch (err) {
          console.warn(`[Google Gemini TTS] Model ${modelName} failed: ${err.message}`);
          lastError = err;
        }
      }

      if (!base64Audio) {
        throw lastError || new Error("Failed to generate TTS audio with Google Gemini");
      }

      audioBuffer = Buffer.from(base64Audio, "base64");
    } else {
      // Original Sarvam Bulbul:v3 implementation
      console.log(`[Sarvam TTS] Generating TTS for: "${text}" in language: ${language}`);
      const speaker = LANGUAGE_SPEAKERS[language];
      if (!speaker) {
        console.error(`No speaker found for language: ${language}`);
        return false;
      }

      if (!sarvamClient) {
        throw new Error("Sarvam client not initialized. Check your SARVAM_API_KEY");
      }

      const response = await sarvamClient.textToSpeech.convert({
        model: "bulbul:v3",
        text: text,
        target_language_code: language,
        speaker: speaker,
      });

      const base64Audio = response.audios?.[0];
      if (!base64Audio) {
        console.error(`No audio data returned for: ${outputPath}`);
        return false;
      }

      audioBuffer = Buffer.from(base64Audio, "base64");
    }

    // Ensure the directory exists
    const dir = path.dirname(outputPath);
    ensureDirectoryExists(dir);

    // Write the audio file
    fs.writeFileSync(outputPath, audioBuffer);
    console.log(`✅ Downloaded and saved audio: ${outputPath}`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to generate/download TTS for ${outputPath}:`, error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data?.toString());
    }
    return false;
  }
}

/**
 * Download all TTS audio files based on prompts.json
 */
async function downloadAllTTSFiles() {
  console.log("🚀 Starting TTS audio generation/download...");

  // Get the project root directory (two levels up from utils)
  const projectRoot = path.resolve(__dirname, "..");
  const audioBasePath = path.join(projectRoot, "public", "audio");

  let successCount = 0;
  let totalCount = 0;

  for (const prompt of prompts) {
    const { filename, texts } = prompt;

    for (const [language, text] of Object.entries(texts)) {
      totalCount++;

      // Create language-specific directory
      const languageDir = path.join(audioBasePath, language);
      const outputPath = path.join(languageDir, `${filename}.wav`);

      const success = await downloadTTSAudio(text, language, outputPath);
      if (success) {
        successCount++;
      }

      // Add a small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n📊 Generation Summary:`);
  console.log(`✅ Successful: ${successCount}/${totalCount}`);
  console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`);

  if (successCount === totalCount) {
    console.log("🎉 All TTS files generated successfully!");
  } else {
    console.log("⚠️ Some files failed to generate. Check the errors above.");
  }
}

/**
 * Download TTS audio for a specific prompt and language
 * @param {string} filename - Prompt filename
 * @param {string} language - Language code
 */
async function downloadSpecificTTS(filename, language) {
  const prompt = prompts.find(p => p.filename === filename);
  if (!prompt) {
    console.error(`❌ Prompt not found: ${filename}`);
    return;
  }

  const text = prompt.texts[language];
  if (!text) {
    console.error(`❌ Text not found for ${filename} in language ${language}`);
    return;
  }

  const projectRoot = path.resolve(__dirname, "..");
  const audioBasePath = path.join(projectRoot, "public", "audio");
  const languageDir = path.join(audioBasePath, language);
  const outputPath = path.join(languageDir, `${filename}.wav`);

  const success = await downloadTTSAudio(text, language, outputPath);
  if (success) {
    console.log(`✅ Successfully generated ${filename} for ${language}`);
  }
}

/**
 * Test the connection to the configured AI TTS API
 */
async function testAPIConnection() {
  const isGoogle = process.env.AI_PROVIDER === "google";
  if (isGoogle) {
    return !!process.env.GEMINI_API_KEY;
  }
  return !!process.env.SARVAM_API_KEY;
}

// Export functions for use in other modules
export {
  downloadAllTTSFiles,
  downloadSpecificTTS,
  downloadTTSAudio,
  testAPIConnection
};

// If this file is run directly, download all TTS files
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  downloadAllTTSFiles().catch(console.error);
}
