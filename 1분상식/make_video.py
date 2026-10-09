"""1분 상식 쇼츠 영상 생성기 (1080x1920, 60초, 30fps)
필요: python3, Pillow, numpy, ffmpeg
실행: python3 make_video.py  →  1분상식_놀라운상식9.mp4
"""
import math, os, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, DUR = 1080, 1920, 30, 60
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "1분상식_놀라운상식9.mp4")
FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"

# (분야, 이모지, 색, 질문, 정답 큰글씨, 설명)
FACTS = [
    ("식물", "🍌", (76, 175, 80), "바나나와 딸기,\n'진짜 베리'는?",
     "바나나!", "식물학적으로 바나나는 베리,\n딸기는 베리가 아니에요"),
    ("음악", "🎵", (156, 39, 176), "좋아하는 노래에서\n소름 돋는 이유는?",
     "도파민", "음악의 절정에서 뇌는\n쾌감 물질 도파민을 분비해요"),
    ("문학", "📖", (121, 85, 72), "종교 서적 빼고 가장 많이\n번역된 책은?",
     "어린 왕자", "500개가 넘는 언어와\n방언으로 번역됐어요"),
    ("신체", "🫀", (229, 57, 53), "강한 위산 속에서\n위는 왜 안 녹을까?",
     "3~5일마다 교체", "위벽 세포는 며칠마다\n새것으로 바뀌어요"),
    ("체육", "🏃", (255, 143, 0), "마라톤은 왜\n42.195km일까?",
     "영국 왕실 때문", "1908 런던올림픽, 윈저성 출발\n왕실 관람석 앞 도착에 맞춘 거리"),
    ("의학", "💊", (0, 150, 136), "최초의 항생제\n페니실린의 발견은?",
     "휴가 덕분", "1928년 플레밍이 휴가 후 방치된\n배양접시의 곰팡이에서 발견"),
    ("교육", "🧠", (63, 81, 181), "오늘 배운 내용,\n하루 뒤 얼마나 잊을까?",
     "약 3분의 2", "에빙하우스 망각곡선!\n그래서 '복습'이 답이에요"),
    ("과학", "☀️", (251, 192, 45), "지금 보는 태양은\n언제의 모습일까?",
     "약 8분 전", "햇빛이 지구에 닿기까지\n약 8분 20초가 걸려요"),
    ("심리학", "🔦", (233, 30, 99), "남들은 내 실수를\n얼마나 기억할까?",
     "생각의 절반", "스포트라이트 효과:\n남들은 생각보다 나를 덜 봐요"),
]
HOOK = (0.0, 4.0)
SEG = 6.0
SEG0 = 4.0
OUTRO = SEG0 + SEG * len(FACTS)  # 58.0

_font_cache = {}
def font(sz):
    if sz not in _font_cache:
        _font_cache[sz] = ImageFont.truetype(FONT, sz)
    return _font_cache[sz]

_emoji_cache = {}
def emoji_img(ch, size):
    key = (ch, size)
    if key not in _emoji_cache:
        f = ImageFont.truetype(EMOJI, 109)
        im = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((80, 80), ch, font=f, embedded_color=True, anchor="mm")
        im = im.crop(im.getbbox())
        r = size / max(im.size)
        _emoji_cache[key] = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
    return _emoji_cache[key]

def fit(s, sz, maxw):
    while sz > 40 and font(sz).getlength(s) + 24 > maxw:
        sz -= 4
    return sz

def ease_out_back(x):
    x = min(max(x, 0), 1)
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2

def ease_out(x):
    x = min(max(x, 0), 1)
    return 1 - (1 - x) ** 3

def bg_gradient(c, t):
    top = np.array([12, 14, 30], float)
    bot = np.array(c, float) * 0.55 + 10
    y = np.linspace(0, 1, H)[:, None]
    wobble = 0.05 * math.sin(t * 1.3)
    m = np.clip(y + wobble, 0, 1) ** 1.4
    arr = top * (1 - m) + bot * m
    arr = np.repeat(arr[:, None, :], W, axis=1).reshape(H, W, 3)
    return Image.fromarray(arr.astype(np.uint8), "RGB")

def text_center(d, y, s, sz, fill=(255, 255, 255), stroke=8, scale=1.0, alpha=255):
    size = max(8, int(sz * scale))
    f = font(size)
    lines = s.split("\n")
    lh = int(size * 1.25)
    y0 = y - lh * (len(lines) - 1) / 2
    for i, ln in enumerate(lines):
        d.text((W / 2, y0 + i * lh), ln, font=f, fill=fill + (alpha,), anchor="mm",
               stroke_width=max(2, int(stroke * scale)), stroke_fill=(0, 0, 0, alpha))

def overlay_text(base, fn):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    fn(ImageDraw.Draw(layer))
    base.alpha_composite(layer)

def pill(d, cx, cy, w, h, color, alpha=255):
    d.rounded_rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], radius=h / 2,
                        fill=tuple(color) + (alpha,))

def header(im, t):
    def f(d):
        pill(d, W / 2, 130, 560, 96, (255, 214, 0))
        d.text((W / 2, 130), "1분 상식 · 놀라운 사실", font=font(52), fill=(20, 20, 20), anchor="mm")
        # 진행 바
        d.rounded_rectangle([60, 1840, W - 60, 1862], radius=11, fill=(255, 255, 255, 60))
        d.rounded_rectangle([60, 1840, 60 + (W - 120) * min(t / DUR, 1), 1862], radius=11,
                            fill=(255, 214, 0, 255))
    overlay_text(im, f)

def render(t):
    if t < SEG0:
        im = bg_gradient((255, 120, 0), t).convert("RGBA")
        lt = t
        def f(d):
            text_center(d, 620, "이거 알면", 110, scale=ease_out_back(lt / 0.5))
            text_center(d, 800, "상식 만렙!", 150, fill=(255, 214, 0), scale=ease_out_back((lt - 0.4) / 0.5))
            if lt > 1.2:
                a = int(255 * ease_out((lt - 1.2) / 0.4))
                text_center(d, 1080, "식물·음악·문학·신체·체육\n의학·교육·과학·심리학", 64, alpha=a)
            if lt > 2.2:
                text_center(d, 1400, "9가지 놀라운 상식, 1분 컷!", 72, fill=(255, 255, 255),
                            scale=ease_out_back((lt - 2.2) / 0.5))
        overlay_text(im, f)
        for i, (_, e, *_r) in enumerate(FACTS):
            row, col_i, cnt = (0, i, 5) if i < 5 else (1, i - 5, 4)
            sc = ease_out_back((t - 0.15 * i) / 0.5)
            if sc <= 0.1:
                continue
            em = emoji_img(e, int(110 * sc))
            ex = int(W * (col_i + 0.5) / cnt) - em.width // 2
            ey = int((420 if row == 0 else 1620) + 18 * math.sin(t * 3 + i)) - em.height // 2
            im.alpha_composite(em, (ex, ey))
    elif t < OUTRO:
        idx = int((t - SEG0) // SEG)
        lt = (t - SEG0) - idx * SEG
        cat, e, col, q, ans, exp = FACTS[idx]
        im = bg_gradient(col, t).convert("RGBA")
        # 번호 + 분야 뱃지
        def f(d):
            s = ease_out_back(lt / 0.4)
            pill(d, W / 2, 300, 420 * s, 110 * s, col)
            if s > 0.3:
                d.text((W / 2, 300), f"{idx + 1}. {cat}", font=font(max(8, int(64 * s))),
                       fill=(255, 255, 255), anchor="mm")
        overlay_text(im, f)
        # 이모지 (살짝 둥실)
        es = int(220 * ease_out_back((lt - 0.1) / 0.5))
        if es > 10:
            em = emoji_img(e, es)
            im.alpha_composite(em, (W // 2 - em.width // 2, int(560 - em.height / 2 + 15 * math.sin(lt * 3))))
        def g(d):
            if lt < 2.6:
                text_center(d, 960, q, 82, scale=ease_out((lt - 0.3) / 0.4))
                # 카운트다운 점
                if lt > 0.9:
                    n = 3 - int((lt - 0.9) / 0.57)
                    if n > 0:
                        text_center(d, 1260, str(n), 140, fill=(255, 214, 0), scale=0.6 + 0.4 * ease_out_back(((lt - 0.9) % 0.57) / 0.3))
            else:
                at = lt - 2.6
                text_center(d, 820, q.replace("\n", " "), 48, fill=(220, 220, 220), stroke=5)
                text_center(d, 1050, ans, fit(ans, 150, W - 140), fill=(255, 214, 0), stroke=12, scale=ease_out_back(at / 0.45))
                if at > 0.5:
                    text_center(d, 1340, exp, 64, alpha=int(255 * ease_out((at - 0.5) / 0.4)))
        overlay_text(im, g)
    else:
        lt = t - OUTRO
        im = bg_gradient((255, 214, 0), t).convert("RGBA")
        def f(d):
            text_center(d, 760, "몇 개나 알고 있었나요?", 88, scale=ease_out_back(lt / 0.4))
            text_center(d, 960, "댓글로 알려주세요 👇".replace(" 👇", ""), 76, fill=(255, 214, 0),
                        scale=ease_out_back((lt - 0.3) / 0.4))
            if lt > 0.7:
                pill(d, W / 2, 1220, 640, 140, (229, 57, 53))
                d.text((W / 2, 1220), "구독 · 좋아요", font=font(72), fill=(255, 255, 255), anchor="mm")
        overlay_text(im, f)
    header(im, t)
    return im.convert("RGB")

# ---------- 오디오: 배경음 + 효과음 ----------
SR = 44100
def make_audio(path):
    n = int(SR * DUR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    bpm = 100
    beat = 60 / bpm
    chords = [(261.63, 329.63, 392.00), (220.00, 261.63, 329.63),
              (174.61, 220.00, 261.63), (196.00, 246.94, 293.66)]  # C Am F G
    bar = beat * 4
    for b in range(int(DUR / bar) + 1):
        ch = chords[b % 4]
        s0, s1 = int(b * bar * SR), min(n, int((b + 1) * bar * SR))
        if s0 >= n:
            break
        tt = t[s0:s1] - b * bar
        env = np.exp(-tt * 0.6) * 0.5 + 0.5
        for fq in ch:
            out[s0:s1] += 0.035 * env * np.sin(2 * np.pi * fq * tt)
        # 베이스
        out[s0:s1] += 0.06 * np.exp(-((tt % beat) * 4)) * np.sin(2 * np.pi * ch[0] / 2 * tt)
    # 킥 + 하이햇
    for k in range(int(DUR / beat)):
        s0 = int(k * beat * SR)
        L = int(0.15 * SR)
        tt = np.arange(min(L, n - s0)) / SR
        out[s0:s0 + len(tt)] += 0.18 * np.exp(-tt * 25) * np.sin(2 * np.pi * (60 + 80 * np.exp(-tt * 40)) * tt)
        h0 = int((k + 0.5) * beat * SR)
        if h0 < n:
            L2 = min(int(0.04 * SR), n - h0)
            out[h0:h0 + L2] += 0.03 * np.random.randn(L2) * np.exp(-np.arange(L2) / SR * 80)
    # 정답 '딩' 효과음 + 질문 '뽁' 효과음
    def ding(at, f1, f2, vol=0.25, length=0.6):
        s0 = int(at * SR)
        tt = np.arange(min(int(length * SR), n - s0)) / SR
        out[s0:s0 + len(tt)] += vol * np.exp(-tt * 6) * (np.sin(2 * np.pi * f1 * tt) + 0.5 * np.sin(2 * np.pi * f2 * tt))
    for i in range(len(FACTS)):
        st = SEG0 + i * SEG
        ding(st, 660, 990, 0.15, 0.25)
        ding(st + 2.6, 1046.5, 1568, 0.25, 0.8)
    ding(0.0, 523, 784, 0.2, 0.5)
    ding(OUTRO, 784, 1175, 0.25, 0.8)
    # 페이드 인/아웃
    fade = int(SR * 1.0)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)
    out = np.clip(out / max(1e-9, np.abs(out).max()) * 0.85, -1, 1)
    pcm = (out * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())

def main():
    wav = os.path.join(HERE, "_bgm.wav")
    make_audio(wav)
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", wav,
           "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", OUT]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for fr in range(DUR * FPS):
        p.stdin.write(render(fr / FPS).tobytes())
    p.stdin.close(); p.wait()
    os.remove(wav)
    print("완료:", OUT)

if __name__ == "__main__":
    main()
