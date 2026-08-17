import { EdgeTTS } from 'edge-tts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, '../public/voices');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// "si-LK-SameeraNeural" is a male Sinhala voice from Microsoft Edge TTS
const tts = new EdgeTTS({
  voice: 'si-LK-SameeraNeural',
  rate: '+15%', // Faster for more energy!
  pitch: '+0Hz',
});

const phrases = [
  { text: "නියමයි", file: "niyamai.mp3" },
  { text: "පට්ට", file: "patta.mp3" },
  { text: "එළකිරි", file: "elakiri.mp3" },
  { text: "වැඩක් නෑ කතා කරලා", file: "wedak_na.mp3" },
  { text: "දින්නා ජයවේවා", file: "win.mp3" },
  { text: "අයියෝ පරාදයි", file: "lose.mp3" }
];

async function generateAll() {
  for (const phrase of phrases) {
    try {
      const dest = path.join(outputDir, phrase.file);
      await tts.ttsPromise(phrase.text, dest);
      console.log(`Saved: ${phrase.file}`);
      // Wait a bit
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`Error for ${phrase.file}:`, err);
    }
  }
}

generateAll();
