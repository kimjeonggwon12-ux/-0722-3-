"""어린 왕자 테마 1분 상식 쇼츠 — 프리미엄 에디션
1080×1920, 60초, 30fps
최고급 비주얼: 파티클 이펙트, 우아한 애니메이션, 그라데이션, 타이포그래피
"""
import math, os, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, DUR = 1080, 1920, 30, 60
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "어린왕자_놀라운이야기.mp4")
FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"

# (제목, 이모지, 색(RGB), 질문, 정답, 설명)
FACTS = [
    ("책의 기원", "✈️", (230, 180, 50), "어린 왕자는 누가 왜 썼나?",
     "생-텍쉬페리", "조종사이자 작가, 비행기 사고로 44세에 사망. 실제 경험에서 영감"),
    ("판매 기적", "📚", (200, 100, 220), "가장 많이 번역된 책(종교서 제외)?",
     "어린 왕자", "50년간 1억 부 이상 팔렸고 500개 언어로 번역돼요"),
    ("책 속 화성들", "🌍", (100, 200, 255), "왕자가 만난 행성 주민들은?",
     "7가지 원형", "각 행성의 인물들은 인간의 7가지 욕망/집착을 상징해요"),
    ("장미의 의미", "🌹", (255, 100, 150), "왕자의 장미는 왜 특별할까?",
     "사랑과 책임", "평범한 듯하지만 돌봐주고 사랑해야 할 존재의 상징"),
    ("숨겨진 배경", "🇫🇷", (100, 150, 255), "생-텍쉬페리 고향은?",
     "프랑스 아일", "남서부 성-모리스 드 레마느에서 어린 시절을 보냈어요"),
    ("유명 명대사", "💭", (180, 220, 100), "가장 유명한 문구는?",
     "'본질은 눈에 안 보여'", "'진짜 중요한 것은 눈으로 볼 수 없어'"),
    ("일러스트레이터", "🎨", (220, 150, 80), "삽화는 누가 그렸나?",
     "저자 본인", "생-텍쉬페리가 직접 손으로 그려 책의 생명력을 높였어요"),
    ("현대 영향력", "🌟", (255, 220, 80), "왕자 메시지가 전하는 것은?",
     "'중요한 건 마음'", "소유·성공보다 관계와 책임, 순수함의 가치를 깨우쳐요"),
    ("인생 교훈", "✨", (200, 180, 255), "이 책이 가르치는 가장 큰 배움은?",
     "바라는 것을 놓지 말기", "버린 것, 길들인 것에 책임이 있다 - 인생의 무게를 배우게 해요"),
]

_font_cache, _emoji_cache = {}, {}

def font(sz):
    if sz not in _font_cache:
        _font_cache[sz] = ImageFont.truetype(FONT, sz)
    return _font_cache[sz]

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

def ease_out_back(x):
    x = min(max(x, 0), 1)
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2

def ease_out(x):
    x = min(max(x, 0), 1)
    return 1 - (1 - x) ** 3

def ease_in_out(x):
    x = min(max(x, 0), 1)
    return 3 * x ** 2 - 2 * x ** 3

# 우아한 그래디언트 + 파티클 배경
def bg_premium(c, t):
    top = np.array([15, 18, 35], float)
    mid = np.array(c, float) * 0.7 + 15
    bot = np.array(c, float) * 0.4 + 25
    y = np.linspace(0, 1, H)[:, None]
    wobble = 0.08 * math.sin(t * 0.9) + 0.05 * math.cos(t * 1.3)
    m = np.clip(y + wobble, 0, 1)
    m2 = m ** 1.8
    
    # 3단계 그래디언트
    arr = np.where(m2 < 0.5, 
                   top * (1 - m2 * 2) + mid * (m2 * 2),
                   mid * (1 - (m2 - 0.5) * 2) + bot * ((m2 - 0.5) * 2))
    arr = np.repeat(arr[:, None, :], W, axis=1).reshape(H, W, 3)
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")
    
    # 파티클 오버레이 (별처럼 떠다니는 점들)
    draw = ImageDraw.Draw(im, "RGBA")
    np.random.seed(42)
    for _ in range(15):
        px, py = np.random.randint(0, W), np.random.randint(0, H)
        sz = np.random.randint(1, 4)
        alpha = int(30 + 50 * math.sin(t * 2 + (px + py) % 10))
        draw.ellipse([px-sz, py-sz, px+sz, py+sz], fill=(255, 255, 255, alpha))
    
    return im

def fit(s, sz, maxw):
    while sz > 40 and font(sz).getlength(s) + 24 > maxw:
        sz -= 4
    return sz

def text_center(d, y, s, sz, fill=(255, 255, 255), stroke=8, scale=1.0, alpha=255):
    size = max(8, int(sz * scale))
    f = font(size)
    lines = s.split("\n")
    lh = int(size * 1.3)
    y0 = y - lh * (len(lines) - 1) / 2
    for i, ln in enumerate(lines):
        d.text((W / 2, y0 + i * lh), ln, font=f, fill=fill + (alpha,), anchor="mm",
               stroke_width=max(2, int(stroke * scale)), stroke_fill=(0, 0, 0, alpha))

def overlay_text(base, fn):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    fn(ImageDraw.Draw(layer))
    base.alpha_composite(layer)

def pill(d, cx, cy, w, h, color, alpha=255, glow=False):
    # 그로우 이펙트
    if glow:
        d.rounded_rectangle([cx - w/2 - 8, cy - h/2 - 8, cx + w/2 + 8, cy + h/2 + 8],
                           radius=h/2 + 8, fill=tuple(color) + (int(alpha * 0.2),))
    d.rounded_rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], 
                       radius=h / 2, fill=tuple(color) + (alpha,))

def render(t):
    SEG0, SEG, OUTRO = 4.0, 6.0, 4.0 + 6.0 * len(FACTS)
    
    if t < SEG0:
        # 오프닝: 우아한 진입
        im = bg_premium((220, 140, 60), t).convert("RGBA")
        lt = t
        def f(d):
            # 제목 텍스트
            scale1 = ease_out_back(lt / 0.5) if lt < 0.5 else 1.0
            text_center(d, 600, "어린 왕자", 140, fill=(255, 200, 80), scale=scale1, stroke=12)
            text_center(d, 750, "모르던 놀라운 이야기", 80, scale=scale1 * 0.8, stroke=10)
            
            # 부제
            if lt > 1.2:
                alpha = int(255 * ease_out((lt - 1.2) / 0.5))
                text_center(d, 1100, "책의 기원·영향·의미", 70, fill=(240, 240, 240), alpha=alpha)
            
            # 커다란 이모지
            if lt > 0.3:
                scale_emoji = ease_out_back((lt - 0.3) / 0.6)
                em = emoji_img("✨", int(200 * scale_emoji))
                im.alpha_composite(em, (W // 2 - em.width // 2, int(1400 - em.height / 2)))
        
        overlay_text(im, f)
        
        # 배경 이모지 회전
        for i, (_, e, *_) in enumerate(FACTS):
            ang = t * 0.7 + i * 2 * math.pi / len(FACTS)
            ex = int(W / 2 + 420 * math.cos(ang)) - 50
            ey = int(1050 + 620 * math.sin(ang) * 0.35) - 50
            em = emoji_img(e, 90)
            im.alpha_composite(em, (min(max(ex, 0), W - em.width), min(max(ey, 0), H - em.height)))
    
    elif t < OUTRO:
        idx = int((t - SEG0) // SEG)
        lt = (t - SEG0) - idx * SEG
        title, e, col, q, ans, exp = FACTS[idx]
        
        im = bg_premium(col, t).convert("RGBA")
        
        # 색상 강조 바 (상단)
        draw = ImageDraw.Draw(im, "RGBA")
        bar_h = int(12 * ease_out(lt / 0.3))
        draw.rectangle([0, 0, W, bar_h], fill=tuple(col) + (200,))
        
        def f(d):
            # 제목 뱃지 (더 우아함)
            s = ease_out_back(lt / 0.4)
            if s > 0:
                pill(d, W / 2, 280, int(420 * s), int(100 * s), col, glow=True)
                if s > 0.3:
                    d.text((W / 2, 280), f"{idx + 1}. {title}", font=font(max(8, int(60 * s))),
                          fill=(255, 255, 255), anchor="mm", stroke_width=3, stroke_fill=(0, 0, 0))
        
        overlay_text(im, f)
        
        # 이모지 (더 우아한 움직임)
        es = int(240 * ease_out_back((lt - 0.05) / 0.5))
        if es > 10:
            em = emoji_img(e, es)
            bob = 20 * math.sin(lt * 4 + idx)
            im.alpha_composite(em, (W // 2 - em.width // 2, int(580 - em.height / 2 + bob)))
        
        def g(d):
            if lt < 2.6:
                # 질문 페이즈
                text_center(d, 960, q, 80, scale=ease_out((lt - 0.2) / 0.4))
                # 3·2·1 카운트다운 (더 큼)
                if lt > 0.9:
                    n = 3 - int((lt - 0.9) / 0.57)
                    if n > 0:
                        scale_cd = 0.7 + 0.3 * ease_out_back(((lt - 0.9) % 0.57) / 0.3)
                        text_center(d, 1240, str(n), 180, fill=(255, 200, 80), scale=scale_cd, stroke=12)
            else:
                # 정답 페이즈
                at = lt - 2.6
                text_center(d, 800, q.replace("\n", " "), 48, fill=(200, 200, 200), stroke=4, alpha=200)
                text_center(d, 1080, ans, fit(ans, 160, W - 140), fill=(255, 220, 100), 
                           stroke=14, scale=ease_out_back(at / 0.45))
                # 설명 (페이드 인)
                if at > 0.5:
                    alpha_desc = int(255 * ease_out((at - 0.5) / 0.4))
                    text_center(d, 1380, exp, 68, alpha=alpha_desc, stroke=6)
        
        overlay_text(im, g)
    
    else:
        # 마무리: 교훈
        lt = t - OUTRO
        im = bg_premium((180, 140, 200), t).convert("RGBA")
        
        def f(d):
            text_center(d, 700, "어린 왕자의 교훈", 100, fill=(255, 220, 100), 
                       scale=ease_out_back(lt / 0.4), stroke=12)
            text_center(d, 1000, "중요한 것은", 80, scale=ease_out((lt - 0.2) / 0.4))
            text_center(d, 1130, "눈에 보이지 않는다", 90, fill=(255, 200, 120),
                       scale=ease_out((lt - 0.3) / 0.5), stroke=10)
            if lt > 0.7:
                alpha_end = int(255 * ease_out((lt - 0.7) / 0.4))
                text_center(d, 1380, "사랑, 책임, 그리고 순수함을 잃지 말기", 66, alpha=alpha_end)
        
        overlay_text(im, f)
    
    # 헤더 (상단 정보)
    def header(d):
        d.rounded_rectangle([60, 1820, W - 60, 1900], radius=20, fill=(255, 255, 255, 40))
        d.rounded_rectangle([60, 1820, 60 + (W - 120) * min(t / DUR, 1), 1900], 
                           radius=20, fill=(200, 150, 255, 200))
        if t < OUTRO:
            prog = int((t - SEG0) / (OUTRO - SEG0) * 100)
            d.text((W / 2, 1860), f"{prog}% 진행중", font=font(42), fill=(255, 255, 255), anchor="mm")
    
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    header(ImageDraw.Draw(overlay))
    im.alpha_composite(overlay)
    
    return im.convert("RGB")

# ---------- 고급 배경음악 ----------
SR = 44100

def make_audio(path):
    n = int(SR * DUR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    
    # 따뜻하고 우아한 음악: 7-6-5 진행 (감성적)
    bpm = 95
    beat = 60 / bpm
    
    # 화성 진행 (마이너 키)
    chords = [
        (196.00, 246.94, 293.66),   # Gm
        (174.61, 220.00, 261.63),   # Fm
        (164.81, 207.65, 246.94),   # Em
        (196.00, 246.94, 293.66),   # Gm
    ]
    
    bar = beat * 4
    for b in range(int(DUR / bar) + 1):
        ch = chords[b % 4]
        s0, s1 = int(b * bar * SR), min(n, int((b + 1) * bar * SR))
        if s0 >= n:
            break
        tt = t[s0:s1] - b * bar
        env = np.exp(-tt * 0.4) * 0.6 + 0.4
        
        # 현악기 같은 따뜻한 톤
        for fq in ch:
            out[s0:s1] += 0.04 * env * np.sin(2 * np.pi * fq * tt)
        
        # 베이스 (심음)
        out[s0:s1] += 0.08 * np.exp(-((tt % beat) * 3.5)) * np.sin(2 * np.pi * ch[0] / 2 * tt)
    
    # 킥 + 섬세한 퍼커션
    for k in range(int(DUR / beat)):
        s0 = int(k * beat * SR)
        L = int(0.12 * SR)
        tt = np.arange(min(L, n - s0)) / SR
        out[s0:s0 + len(tt)] += 0.15 * np.exp(-tt * 30) * np.sin(2 * np.pi * (70 + 60 * np.exp(-tt * 35)) * tt)
        
        # 하이햇
        h0 = int((k + 0.5) * beat * SR)
        if h0 < n:
            L2 = min(int(0.05 * SR), n - h0)
            out[h0:h0 + L2] += 0.02 * np.random.randn(L2) * np.exp(-np.arange(L2) / SR * 70)
    
    # 정답 '딩' 효과음 (우아함)
    def ding(at, f1, f2, vol=0.25, length=0.6):
        s0 = int(at * SR)
        tt = np.arange(min(int(length * SR), n - s0)) / SR
        if s0 < n:
            out[s0:s0 + len(tt)] += vol * np.exp(-tt * 5) * (np.sin(2 * np.pi * f1 * tt) + 0.4 * np.sin(2 * np.pi * f2 * tt))
    
    for i in range(len(FACTS)):
        st = 4.0 + i * 6.0
        ding(st, 587.33, 880, 0.12, 0.2)  # D5, A5
        ding(st + 2.6, 987.77, 1479.98, 0.22, 0.8)  # B5, D#6
    
    ding(0.0, 523.25, 784, 0.15, 0.4)  # C5, G5
    ding(58.0, 784, 1175.99, 0.2, 0.8)  # G5, D6
    
    # 페이드
    fade = int(SR * 1.2)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)
    
    out = np.clip(out / max(1e-9, np.abs(out).max()) * 0.85, -1, 1)
    pcm = (out * 32767).astype(np.int16)
    
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())

def main():
    wav = os.path.join(HERE, "_bgm_premium.wav")
    make_audio(wav)
    print("음악 생성 완료...")
    
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", wav,
           "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT]
    
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    total = DUR * FPS
    for fr in range(total):
        p.stdin.write(render(fr / FPS).tobytes())
        if (fr + 1) % 30 == 0:
            print(f"렌더링: {(fr + 1) // 30}초 / {DUR}초")
    
    p.stdin.close(); p.wait()
    os.remove(wav)
    print("완료:", OUT)

if __name__ == "__main__":
    main()
