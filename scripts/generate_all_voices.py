"""
Canonical Sinhala voice-announcer asset generator.

Generates 36 clips: 3 colloquial variants x 6 trigger keys x 2 genders, written to
public/voices/{male,female}/<key>_<n>.mp3

Run:  python scripts/generate_all_voices.py
Deps: pip install edge-tts

This is the ONLY generator script — the older generate_voices.js /
generate_edge_voices.js / generate_edge_voices.py were removed because they
produced the earlier flat, dictionary-style phrasing.
"""

import asyncio
import os
import sys

import edge_tts

# The Windows console defaults to cp1252, which cannot encode Sinhala — printing
# a phrase would raise UnicodeEncodeError *after* the clip had already been
# written. Fall back to replacement chars rather than losing the run.
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except (AttributeError, OSError):
    pass

BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'voices')

VOICES = {
    'male': 'si-LK-SameeraNeural',
    'female': 'si-LK-ThiliniNeural',
}

VOLUME = '+25%'

# Per-trigger prosody. The pitch ladder is unchanged from the previous revision
# (it was already tuned); rates are the modest bumps from the revised plan.
PROSODY = {
    'niyamai':  {'pitch_male': '+4Hz',  'pitch_female': '+6Hz',  'rate_male': '+12%', 'rate_female': '+12%'},
    'patta':    {'pitch_male': '+6Hz',  'pitch_female': '+8Hz',  'rate_male': '+18%', 'rate_female': '+16%'},
    'elakiri':  {'pitch_male': '+8Hz',  'pitch_female': '+10Hz', 'rate_male': '+22%', 'rate_female': '+20%'},
    'wedak_na': {'pitch_male': '+10Hz', 'pitch_female': '+12Hz', 'rate_male': '+28%', 'rate_female': '+25%'},
    'win':      {'pitch_male': '+6Hz',  'pitch_female': '+8Hz',  'rate_male': '+15%', 'rate_female': '+15%'},
    'lose':     {'pitch_male': '-6Hz',  'pitch_female': '-4Hz',  'rate_male': '-12%', 'rate_female': '-10%'},
}

# 3 colloquial variants per trigger, picked at random by the game at runtime.
PHRASES = {
    'niyamai': [
        'නියමයි මචං!',
        'හොඳයි හොඳයි!',
        'සුපිරි!',
    ],
    'patta': [
        'පට්ට මචං!',
        'මරු මරු!',
        'අනේ පට්ටයි!',
    ],
    'elakiri': [
        'එළකිරි ආආ!',
        'අම්මෝ පට්ටයි!',
        'මෙන්න ගේම!',
    ],
    'wedak_na': [
        'අම්මෝ! වැඩක් නෑ කතා කරලා!',
        'බලාගෙන! සුපිරිම සුපිරි!',
        'මචං මේක නම් ලොකු වැඩක්!',
    ],
    'win': [
        'දින්නා මචං! ජයවේවා!',
        'චැම්පියන්! නියමයි!',
        'ගේම ඔබේ! සුපිරි!',
    ],
    'lose': [
        'අයියෝ... පරාදයි මචං!',
        'අනේ! ඊළඟ පාර හරි!',
        'කමක් නෑ, නැවත උත්සාහ කරමු!',
    ],
}


async def generate():
    total = 0
    for gender, voice in VOICES.items():
        out_dir = os.path.join(BASE_DIR, gender)
        os.makedirs(out_dir, exist_ok=True)

        for key, variants in PHRASES.items():
            prosody = PROSODY[key]
            pitch = prosody[f'pitch_{gender}']
            rate = prosody[f'rate_{gender}']

            for idx, text in enumerate(variants, start=1):
                filename = f'{key}_{idx}.mp3'
                dest = os.path.join(out_dir, filename)
                communicate = edge_tts.Communicate(
                    text=text,
                    voice=voice,
                    pitch=pitch,
                    rate=rate,
                    volume=VOLUME,
                )
                await communicate.save(dest)
                total += 1
                print(f'[{gender}] {filename}  pitch={pitch} rate={rate}  "{text}"')

    print(f'\nDone — {total} clips written to public/voices/')


if __name__ == '__main__':
    asyncio.run(generate())
