"""어린 왕자 — 애니메이션 영화 스타일
스튜디오 지브리 + 디즈니 감성
1080×1920, 60초
"""
import math, os, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, DUR = 1080, 1920, 30, 60
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "어린왕자_영화스타일.mp4")
FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"

def font(sz):
    return ImageFont.truetype(FONT, sz)

def smooth(x, typ='ease_out'):
    x = min(max(x, 0), 1)
    if typ == 'ease_out':
        return 1 - (1 - x) ** 3
    elif typ == 'ease_elastic':
        return 1 + (x - 1) * (0.25 * math.sin(x * math.pi * 4) + 1) if x > 0 else 0
    return x

def soft_bg(t, r, g, b):
    """부드러운 그래디언트"""
    top = np.array([15, 20, 45], float)
    bot = np.array([r, g, b], float)
    y = np.linspace(0, 1, H)[:, None]
    m = np.clip(y + 0.1 * math.sin(t * 0.8), 0, 1) ** 1.2
    col = top * (1 - m) + bot * m
    col = np.repeat(col[:, None, :], W, axis=1).reshape(H, W, 3)
    return Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), "RGB")

def add_stars(draw, t):
    """배경 별들"""
    np.random.seed(42)
    for _ in range(40):
        sx, sy = np.random.randint(0, W), np.random.randint(0, H)
        twinkle = int(80 + 120 * math.sin(t * 2 + sx + sy))
        draw.ellipse([sx-1, sy-1, sx+2, sy+2], fill=(255, 255, 220, twinkle))

def render(t):
    """프레임"""
    if t < 8:
        # 오프닝
        im = soft_bg(t, 45, 35, 80).convert("RGBA")
        draw = ImageDraw.Draw(im)
        add_stars(draw, t)
        
        p = smooth(t / 8)
        txt = Image.new("RGBA", im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(txt)
        a = int(255 * p)
        d.text((W//2, 800), "어린 왕자", font=font(140), 
               fill=(255, 220, 100, a), anchor="mm", 
               stroke_width=6, stroke_fill=(100, 80, 0, a))
        d.text((W//2, 1000), "세상에서 가장 아름다운 책",
               font=font(85), fill=(255, 255, 255, a), anchor="mm",
               stroke_width=3, stroke_fill=(50, 50, 50, a))
        im.alpha_composite(txt)
    
    elif t < 18:
        # 저자
        im = soft_bg(t, 200, 100, 60).convert("RGBA")
        draw = ImageDraw.Draw(im)
        add_stars(draw, t)
        
        pt = (t - 8) / 10
        plane_x = int(W * pt * 0.8)
        draw.polygon([(plane_x-40, 400), (plane_x+40, 400),
                     (plane_x+25, 420), (plane_x-25, 420)],
                    fill=(150, 150, 150, 200))
        
        # 구름
        for cx in [150, 500, 850]:
            cy = 500
            for ox in [-40, 0, 40]:
                draw.ellipse([cx+ox-30, cy-20, cx+ox+30, cy+20],
                            fill=(220, 220, 220, 150))
        
        txt = Image.new("RGBA", im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(txt)
        a = int(255 * smooth(pt))
        d.text((W//2, 1200), "생-텍쉬페리",
               font=font(110), fill=(255, 200, 100, a), anchor="mm",
               stroke_width=5, stroke_fill=(100, 80, 0, a))
        d.text((W//2, 1350), "조종사이자 작가",
               font=font(80), fill=(255, 255, 255, a), anchor="mm",
               stroke_width=3, stroke_fill=(50, 50, 50, a))
        im.alpha_composite(txt)
    
    elif t < 28:
        # 행성들
        im = soft_bg(t, 60, 30, 100).convert("RGBA")
        draw = ImageDraw.Draw(im)
        add_stars(draw, t)
        
        pt = (t - 18) / 10
        planets = [
            (200, 400, 50, (255, 100, 100)),
            (950, 350, 60, (100, 200, 255)),
            (500, 700, 45, (255, 200, 100)),
            (250, 1200, 55, (200, 100, 255)),
            (850, 1150, 50, (100, 255, 200)),
            (500, 1550, 65, (255, 150, 150)),
        ]
        
        for idx, (px, py, pr, pcol) in enumerate(planets):
            delay = idx * 0.08
            pp = max(0, min(1, (pt - delay) * 1.5))
            if pp > 0:
                scale = smooth(pp, 'ease_elastic')
                r = int(pr * scale)
                if r > 2:
                    draw.ellipse([px-r, py-r, px+r, py+r], fill=pcol)
                    # 하이라이트
                    if r > 8:
                        hc = tuple(min(255, c + 50) for c in pcol)
                        draw.ellipse([px-r//3, py-r//2, px+r//3, py-r//4], 
                                   fill=hc + (120,))
        
        txt = Image.new("RGBA", im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(txt)
        a = int(255 * smooth(pt))
        d.text((W//2, 120), "여행", font=font(110),
               fill=(255, 220, 100, a), anchor="mm",
               stroke_width=4, stroke_fill=(100, 80, 0, a))
        d.text((W//2, 240), "6개의 행성을 만나다", font=font(75),
               fill=(255, 220, 100, a), anchor="mm",
               stroke_width=3, stroke_fill=(100, 80, 0, a))
        im.alpha_composite(txt)
    
    elif t < 38:
        # 여우
        im = soft_bg(t, 50, 100, 180).convert("RGBA")
        draw = ImageDraw.Draw(im)
        add_stars(draw, t)
        
        pt = (t - 28) / 10
        
        # 왕자 (간단)
        px = 280 - 80 * pt
        draw.polygon([(px-10, 1000), (px-12, 1015), (px+12, 1015), (px+10, 1000)],
                    fill=(255, 120, 100))
        draw.ellipse([px-12, 980, px+12, 1000], fill=(255, 200, 150))
        
        # 여우 (간단)
        fx = 800 + 80 * pt
        draw.polygon([(fx, 1040), (fx-20, 1050), (fx+20, 1050)],
                    fill=(220, 120, 50))
        draw.ellipse([fx-15, 1030, fx+15, 1050], fill=(230, 140, 60))
        
        txt = Image.new("RGBA", im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(txt)
        a = int(255 * smooth(pt))
        d.text((W//2, 120), "여우와의 만남",
               font=font(110), fill=(255, 200, 100, a), anchor="mm",
               stroke_width=5, stroke_fill=(100, 80, 0, a))
        im.alpha_composite(txt)
    
    elif t < 48:
        # 장미
        im = soft_bg(t, 100, 150, 80).convert("RGBA")
        draw = ImageDraw.Draw(im)
        add_stars(draw, t)
        
        pt = (t - 38) / 10
        bloom = smooth(pt)
        
        # 장미
        rx, ry = W // 2, 700
        draw.line([(rx, ry), (rx-2, ry+30)], fill=(80, 140, 80), width=3)
        
        r = int(15 * bloom)
        if r > 0:
            for col in [(255, 80, 120), (255, 120, 150), (255, 150, 180)]:
                draw.ellipse([rx-r, ry-r, rx+r, ry+r], fill=col)
                r = int(r * 0.7)
        
        txt = Image.new("RGBA", im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(txt)
        a = int(255 * bloom)
        d.text((W//2, 150), "장미", font=font(110),
               fill=(255, 150, 200, a), anchor="mm",
               stroke_width=5, stroke_fill=(100, 50, 80, a))
        d.text((W//2, 280), "평범하지만 가장 소중한", font=font(80),
               fill=(255, 255, 255, a), anchor="mm",
               stroke_width=3, stroke_fill=(50, 50, 50, a))
        im.alpha_composite(txt)
    
    elif t < 58:
        # 메시지
        im = soft_bg(t, 45, 35, 80).convert("RGBA")
        draw = ImageDraw.Draw(im)
        add_stars(draw, t)
        
        pt = (t - 48) / 10
        
        # 빛
        for gr in range(150, 210, 5):
            alpha = int(40 * (1 - (gr - 150) / 60))
            draw.ellipse([W//2-gr, H//2-gr, W//2+gr, H//2+gr],
                        outline=(255, 220, 100, alpha), width=2)
        
        txt = Image.new("RGBA", im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(txt)
        a = int(255 * smooth(pt))
        d.text((W//2, H//2-150), "중요한 것은",
               font=font(110), fill=(255, 220, 100, a), anchor="mm",
               stroke_width=6, stroke_fill=(100, 80, 0, a))
        d.text((W//2, H//2+100), "눈에 보이지 않는다",
               font=font(115), fill=(255, 180, 100, a), anchor="mm",
               stroke_width=6, stroke_fill=(100, 80, 0, a))
        im.alpha_composite(txt)
    
    else:
        # 마무리
        im = soft_bg(t, 45, 35, 80).convert("RGBA")
        pt = (t - 58) / 2
        overlay = Image.new("RGBA", im.size, (0, 0, 0, int(255 * pt)))
        im.alpha_composite(overlay)
    
    return im.convert("RGB")

# 음악
def make_audio(path):
    sr = 44100
    n = int(sr * DUR)
    t = np.arange(n) / sr
    out = np.zeros(n)
    
    # 영화 스타일 피아노
    notes = [[220, 261.63, 329.63, 392],
             [174.61, 261.63, 329.63, 391.99],
             [130.81, 261.63, 329.63, 392],
             [196, 261.63, 329.63, 392]]
    
    bpm = 90
    beat = 60 / bpm
    bar = beat * 4
    
    for bar_idx in range(int(DUR / bar)):
        bar_t = bar_idx * bar
        bar_start = int(bar_t * sr)
        bar_end = min(n, int((bar_idx + 1) * bar * sr))
        
        note_list = notes[bar_idx % 4]
        
        for beat_idx in range(4):
            beat_t = bar_t + beat_idx * beat
            beat_start = int(beat_t * sr)
            beat_end = min(n, int((beat_t + beat * 0.9) * sr))
            
            if beat_start >= n:
                break
            
            fq = note_list[beat_idx % len(note_list)]
            tt = t[beat_start:beat_end] - beat_t
            env = np.exp(-tt * 2.5)
            out[beat_start:beat_end] += 0.1 * env * np.sin(2 * np.pi * fq * tt)
    
    # 베이스
    for bar_idx in range(int(DUR / bar)):
        bar_t = bar_idx * bar
        bar_start = int(bar_t * sr)
        bar_end = min(n, int((bar_idx + 1) * bar * sr))
        
        base_fq = notes[bar_idx % 4][0] / 2
        tt = t[bar_start:bar_end] - bar_t
        out[bar_start:bar_end] += 0.08 * np.sin(2 * np.pi * base_fq * tt)
    
    # 페이드
    fade = int(sr * 1.5)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)
    
    out = np.clip(out / max(1e-9, np.abs(out).max()) * 0.75, -1, 1)
    pcm = (out * 32767).astype(np.int16)
    
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(pcm.tobytes())

def main():
    wav = os.path.join(HERE, "_bgm.wav")
    make_audio(wav)
    print("🎵 음악 완료...")
    
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", wav,
           "-c:v", "libx264", "-preset", "slower", "-crf", "18", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "224k", "-shortest", "-movflags", "+faststart", OUT]
    
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for fr in range(DUR * FPS):
        p.stdin.write(render(fr / FPS).tobytes())
        if (fr + 1) % 30 == 0:
            print(f"  🎬 {(fr+1)//30}초/{DUR}초")
    
    p.stdin.close(); p.wait()
    os.remove(wav)
    print("✓", OUT)

if __name__ == "__main__":
    main()
