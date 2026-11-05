"""
產生「內置普通話語音」錄音檔（voice/cmn/*.mp3 + manifest.json）。

用法（喺 repo 根目錄）：
    python3 -m venv .venv-tts
    .venv-tts/bin/pip install ai-edge-litert numpy scipy pypinyin
    .venv-tts/bin/pip install --no-deps zhtts          # 唔使裝 tensorflow
    .venv-tts/bin/python tools/make_mandarin_voice.py

需要 ffmpeg（將 wav 轉做 mp3）。

語音引擎：zhtts（MIT）內置嘅 FastSpeech2 + MB-MelGAN 中文模型，完全離線。
模型用標貝（Baker）中文語音資料訓練；標貝資料只限非商業用途，學校教學使用冇問題，
如果將來商業發佈（例如收費 app），要換用可商用嘅語音。
"""
import json
import re
import subprocess
import sys
import tempfile
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'voice' / 'cmn'


def litert_as_tensorflow():
    """zhtts 用 tf.lite.Interpreter；用細好多嘅 ai-edge-litert 頂替 tensorflow。"""
    try:
        from ai_edge_litert.interpreter import Interpreter
    except ImportError:
        from tflite_runtime.interpreter import Interpreter
    tf = types.ModuleType('tensorflow')
    tf.lite = types.SimpleNamespace(Interpreter=Interpreter)
    sys.modules['tensorflow'] = tf


def read_lines():
    """由 index.html 讀 WIN_MD（普通話金句）、VOICE_STYLE（要錄邊啲角色）同試聽句。"""
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    win = re.search(r'const WIN_MD = \{(.*?)\n\};', html, re.S).group(1)
    win_md = dict(re.findall(r"(\w+): '([^']+)'", win))
    style = re.search(r'const VOICE_STYLE = \{(.*?)\n\};', html, re.S).group(1)
    keys = re.findall(r'^\s*(\w+):\s*\{', style, re.M)
    sample = re.search(r"cmn: '([^']+)', en: 'English voice", html).group(1)
    lines = {k: win_md[k] for k in keys if k in win_md}
    lines['sample'] = sample
    return lines


def main():
    litert_as_tensorflow()
    from zhtts import TTS
    from scipy.io import wavfile
    import numpy as np

    tts = TTS()
    OUT.mkdir(parents=True, exist_ok=True)
    lines = read_lines()
    done = []
    with tempfile.TemporaryDirectory() as tmp:
        for key, text in lines.items():
            speak = re.sub(r'[……]+', '，', text)          # 省略號讀成停頓
            audio = tts.synthesis(speak)
            peak = float(np.max(np.abs(audio))) or 1.0
            wav = Path(tmp) / f'{key}.wav'
            wavfile.write(wav, tts.sample_rate, (audio / peak * 0.9).astype(np.float32))
            mp3 = OUT / f'{key}.mp3'
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-ac', '1', '-ar', '24000',
                            '-b:a', '48k', str(mp3)], check=True)
            done.append(key)
            print(f'{key}: {text} -> {mp3.relative_to(ROOT)}')
    (OUT / 'manifest.json').write_text(json.dumps({'keys': done, 'engine': 'zhtts fastspeech2 + mb_melgan'},
                                                  ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'完成：{len(done)} 個錄音檔')


if __name__ == '__main__':
    main()
