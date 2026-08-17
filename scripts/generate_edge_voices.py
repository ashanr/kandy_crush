import asyncio
import edge_tts
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'voices', 'female')
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

VOICE = "si-LK-ThiliniNeural"
RATE = "+10%"

phrases = {
    "niyamai.mp3": "නියමයි",
    "patta.mp3": "පට්ට",
    "elakiri.mp3": "එළකිරි",
    "wedak_na.mp3": "වැඩක් නෑ කතා කරලා",
    "win.mp3": "දින්නා ජයවේවා",
    "lose.mp3": "අයියෝ පරාදයි"
}

async def generate():
    for filename, text in phrases.items():
        dest = os.path.join(OUTPUT_DIR, filename)
        communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
        await communicate.save(dest)
        print(f"Saved: {filename}")

if __name__ == "__main__":
    asyncio.run(generate())
