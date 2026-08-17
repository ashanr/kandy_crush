import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.join(__dirname, '../public/voices');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function downloadVoice(text, filename) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=si&client=tw-ob`;
  const dest = path.join(outputDir, filename);
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${filename}: Status ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Saved: ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

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
      await downloadVoice(phrase.text, phrase.file);
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`Error for ${phrase.file}:`, err.message);
    }
  }
}

generateAll();
