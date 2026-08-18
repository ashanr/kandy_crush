import os
import sys
import yt_dlp

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'voices')
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'intro_pebbles.mp3')

URL = 'https://www.youtube.com/watch?v=zx6MSvxtUpQ'

ydl_opts = {
    'format': 'bestaudio/best',
    'outtmpl': os.path.join(OUTPUT_DIR, 'intro_pebbles.%(ext)s'),
    'postprocessors': [{
        'key': 'FFmpegExtractAudio',
        'preferredcodec': 'mp3',
        'preferredquality': '192',
    }],
    'keepvideo': False,
}

print(f"Downloading audio from {URL}...")
try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([URL])
    print("Download completed successfully!")
except Exception as e:
    print(f"yt-dlp download failed: {e}")
