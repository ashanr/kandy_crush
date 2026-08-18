"""
Canonical English voice-announcer asset generator.

Generates 36 clips: 3 variants x 6 trigger keys x 2 genders, written to
public/voices/{male,female}/<key>_<n>.mp3, plus an un-suffixed <key>.mp3 copy
of variant 1 that sound.js falls back to if a variant is missing.

Run:  python scripts/generate_all_voices.py
Deps: pip install edge-tts

The vocabulary is the escalation ladder the genre established -- Sweet, Tasty,
Delicious, Divine -- so the spoken word matches the banner exactly. See
src/utils/announcer.js, which is the single source of truth for which key fires
when; adding a phrase here without adding the key there does nothing.
"""

import asyncio
import os
import shutil
import sys

import edge_tts

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except (AttributeError, OSError):
    pass

BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'voices')

# Guy is Microsoft's "Passion" personality and Emma its "Cheerful" one, which is
# as close as the catalogue gets to a game-show announcer. Deeper options
# (Christopher, Eric) read as authoritative rather than delighted, which is the
# wrong emotion for a candy match.
VOICES = {
    'male': 'en-US-GuyNeural',
    'female': 'en-US-EmmaNeural',
}

VOLUME = '+25%'

# Prosody climbs with the tier so the ladder is audible even if you aren't
# reading the banner. Rates stay moderate: the Sinhala clips these replace ran
# up to +28% and the words ran together, which was reported as the announcer
# sounding rushed. Nothing here exceeds +18%.
PROSODY = {
    'sweet':        {'pitch_male': '+4Hz',  'pitch_female': '+6Hz',  'rate_male': '+8%',  'rate_female': '+8%'},
    'tasty':        {'pitch_male': '+6Hz',  'pitch_female': '+8Hz',  'rate_male': '+12%', 'rate_female': '+12%'},
    'delicious':    {'pitch_male': '+8Hz',  'pitch_female': '+10Hz', 'rate_male': '+14%', 'rate_female': '+14%'},
    'divine':       {'pitch_male': '+10Hz', 'pitch_female': '+12Hz', 'rate_male': '+18%', 'rate_female': '+16%'},
    'sugar_crush':  {'pitch_male': '+8Hz',  'pitch_female': '+10Hz', 'rate_male': '+10%', 'rate_female': '+10%'},
    'out_of_moves': {'pitch_male': '-6Hz',  'pitch_female': '-4Hz',  'rate_male': '-8%',  'rate_female': '-6%'},
}

# 3 variants per trigger, picked at random at runtime so the announcer never
# says the same line twice in a row. Variant 1 is always the canonical single
# word -- it is the one that ships as the legacy fallback clip.
PHRASES = {
    'sweet': [
        'Sweet!',
        'Nice one!',
        'Very sweet!',
    ],
    'tasty': [
        'Tasty!',
        'Very tasty!',
        'Yummy!',
    ],
    'delicious': [
        'Delicious!',
        'Simply delicious!',
        'Mouth-watering!',
    ],
    'divine': [
        'Divine!',
        'Absolutely divine!',
        'Unbelievable!',
    ],
    'sugar_crush': [
        'Sugar Crush!',
        'Level complete!',
        'Sweet victory!',
    ],
    'out_of_moves': [
        'Out of moves!',
        'So close!',
        'Better luck next time!',
    ],
}


async def render(gender, key, index, phrase):
    voice = VOICES[gender]
    p = PROSODY[key]
    out_dir = os.path.join(BASE_DIR, gender)
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f'{key}_{index}.mp3')

    communicate = edge_tts.Communicate(
        phrase,
        voice,
        rate=p[f'rate_{gender}'],
        pitch=p[f'pitch_{gender}'],
        volume=VOLUME,
    )
    await communicate.save(path)

    # sound.js tries <key>_<n>.mp3 first and falls back to <key>.mp3, so a
    # partial regeneration can never leave the announcer mute. Keep that
    # fallback in the same language as the variants.
    if index == 1:
        shutil.copyfile(path, os.path.join(out_dir, f'{key}.mp3'))

    print(f'  {gender}/{key}_{index}.mp3  "{phrase}"')


async def main():
    total = 0
    for gender in VOICES:
        print(f'{gender} ({VOICES[gender]}):')
        for key, phrases in PHRASES.items():
            for i, phrase in enumerate(phrases, 1):
                await render(gender, key, i, phrase)
                total += 1
    print(f'\nDone: {total} clips + {len(PHRASES) * len(VOICES)} fallback copies.')


if __name__ == '__main__':
    asyncio.run(main())
