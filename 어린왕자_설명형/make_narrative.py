"""어린 왕자 — 내레이션 설명형 쇼츠
손그림 스타일 어린왕자 일러스트 + 음성 설명
1080×1920, 60초
"""
import math, os, subprocess, wave, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, DUR = 1080, 1920, 30, 60
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "어린왕자_설명형쇼츠.mp4")
FONT_KR = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"

# 스토리 구간 (시작, 종료, 장면 타입, 제목)
SCENES = [
    (0, 8, "intro", "어린 왕자\n세상에서 가장 아름다운 책"),
    (8, 18, "author", "생-텍쉬페리\n조종사이자 작가"),
    (18, 28, "planet", "6개 행성을 여행하며\n다양한 인물을 만나다"),
    (28, 38, "fox", "여우와의 만남\n'네가 길들인 것에는\n책임이 있다'"),
    (38, 48, "rose", "장미\n평범한 듯하지만\n가장 소중한 존재"),
    (48, 58, "message", "중요한 것은\n눈에 보이지 않는다"),
    (58, 60, "outro", ""),
]

def font(sz):
    return ImageFont.truetype(FONT_KR, sz)

def draw_star(draw, x, y, size, fill=(255, 255, 200, 180)):
    """별 그리기"""
    points = []
    for i in range(10):
        angle = i * math.pi / 5 - math.pi / 2
        r = size if i % 2 == 0 else size / 2
        points.append((x + r * math.cos(angle), y + r * math.sin(angle)))
    draw.polygon(points, fill=fill)

def draw_planet(draw, x, y, r, col, pattern=None):
    """행성 그리기 (손그림 스타일)"""
    # 메인 원
    draw.ellipse([x-r, y-r, x+r, y+r], fill=col)
    # 크레이터 또는 패턴
    if pattern == "crater":
        for _ in range(3):
            cx = x + random.randint(-r//3, r//3)
            cy = y + random.randint(-r//3, r//3)
            cr = r // 6
            c = tuple(max(0, c - 40) for c in col)
            draw.ellipse([cx-cr, cy-cr, cx+cr, cy+cr], fill=c)
    # 테두리 (손그림 느낌)
    draw.ellipse([x-r-2, y-r-2, x+r+2, y+r+2], outline=(100, 100, 100), width=2)

def draw_prince(draw, x, y, scale=1.0):
    """왕자 간단히 그리기"""
    s = scale
    # 머리
    draw.ellipse([x-10*s, y-15*s, x+10*s, y-5*s], fill=(255, 220, 150))
    # 몸
    draw.polygon([(x, y), (x-8*s, y+12*s), (x+8*s, y+12*s)], fill=(255, 100, 100))
    # 목
    draw.rectangle([x-3*s, y-5*s, x+3*s, y], fill=(255, 220, 150))

def draw_fox(draw, x, y, scale=1.0):
    """여우 간단히 그리기"""
    s = scale
    # 몸
    draw.ellipse([x-15*s, y-8*s, x+15*s, y+10*s], fill=(200, 100, 50))
    # 머리
    draw.ellipse([x-8*s, y-12*s, x+8*s, y-2*s], fill=(200, 100, 50))
    # 귀
    draw.polygon([(x-8*s, y-12*s), (x-12*s, y-18*s), (x-4*s, y-14*s)], fill=(200, 100, 50))
    draw.polygon([(x+8*s, y-12*s), (x+12*s, y-18*s), (x+4*s, y-14*s)], fill=(200, 100, 50))

def draw_rose(draw, x, y, scale=1.0):
    """장미 그리기"""
    s = scale
    # 줄기
    draw.line([(x, y), (x, y+30*s)], fill=(100, 150, 100), width=int(2*s))
    # 꽃 (원 3개)
    draw.ellipse([x-8*s, y-8*s, x+8*s, y+8*s], fill=(255, 100, 150))
    draw.ellipse([x-5*s, y-5*s, x+5*s, y+5*s], fill=(255, 150, 180))
    draw.ellipse([x-2*s, y-2*s, x+2*s, y+2*s], fill=(255, 200, 220))

def render(t):
    """프레임 렌더링"""
    # 배경 (우주 같은 그래디언트)
    y_arr = np.linspace(0, 1, H)[:, None]
    r = (20 + int(30 * math.sin(t * 0.5)))
    g = (30 + int(20 * math.cos(t * 0.4)))
    b = (60 + int(40 * math.sin(t * 0.3)))
    
    top = np.array([10, 12, 25])
    bot = np.array([r, g, b])
    col = top * (1 - y_arr) + bot * y_arr
    col = np.repeat(col[:, None, :], W, axis=1).reshape(H, W, 3)
    im = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    draw = ImageDraw.Draw(im, "RGBA")
    
    # 배경 별들
    random.seed(42)
    for _ in range(30):
        sx = random.randint(0, W)
        sy = random.randint(0, H)
        sz = random.randint(1, 3)
        twinkle = int(100 + 100 * math.sin(t * 3 + sx + sy))
        draw.ellipse([sx-sz, sy-sz, sx+sz, sy+sz], 
                     fill=(255, 255, 200, twinkle))
    
    # 현재 장면
    scene = None
    for s, e, typ, title in SCENES:
        if s <= t < e:
            scene = (s, e, typ, title)
            break
    
    if not scene:
        return im.convert("RGB")
    
    s, e, typ, title = scene
    progress = (t - s) / (e - s)
    
    # === 오프닝 ===
    if typ == "intro":
        # 중앙에 별들이 모여 행성 형태
        for i in range(20):
            ang = t * 2 + i * 2 * math.pi / 20
            x = W // 2 + 100 * math.cos(ang)
            y = H // 2 + 100 * math.sin(ang)
            sz = 2 + int(3 * math.sin(t * 4 + i))
            draw.ellipse([x-sz, y-sz, x+sz, y+sz], 
                        fill=(255, 255, 150, int(200 * (1 - progress))))
        
        # 큰 제목
        alpha = int(255 * min(progress * 2, 1))
        txt_layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
        txt_draw = ImageDraw.Draw(txt_layer)
        for line_idx, line in enumerate(title.split("\n")):
            y_pos = 800 + line_idx * 150
            txt_draw.text((W//2, y_pos), line, 
                         font=font(int(100 * min(progress + 0.5, 1))),
                         fill=(255, 220, 100, alpha), anchor="mm",
                         stroke_width=4, stroke_fill=(0, 0, 0, alpha))
        im.alpha_composite(txt_layer)
    
    # === 저자 배경 ===
    elif typ == "author":
        # 비행기 실루엣
        plane_x = int(W * (progress - 0.2) * 3) if progress < 0.5 else int(W * 0.4)
        plane_y = H // 3
        
        # 간단한 비행기 모양
        draw.polygon([(plane_x-30, plane_y), (plane_x+30, plane_y), 
                     (plane_x+20, plane_y+15), (plane_x-20, plane_y+15)],
                    fill=(100, 100, 100, 150))
        
        # 구름
        for cx in [200, 600, 900]:
            cy = 400 + 30 * math.sin(t + cx / 100)
            for i, ox in enumerate([-30, 0, 30]):
                draw.ellipse([cx+ox-25, cy-15, cx+ox+25, cy+15],
                            fill=(200, 200, 200, 100))
        
        # 제목
        txt_layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
        txt_draw = ImageDraw.Draw(txt_layer)
        y_txt = 1200
        for line in title.split("\n"):
            txt_draw.text((W//2, y_txt), line, font=font(90),
                         fill=(255, 200, 80, int(255 * progress)), 
                         anchor="mm", stroke_width=5, stroke_fill=(0, 0, 0))
            y_txt += 120
        im.alpha_composite(txt_layer)
    
    # === 행성들 ===
    elif typ == "planet":
        planets = [
            (150, 400, 50, (255, 100, 100)),
            (950, 350, 60, (100, 200, 255)),
            (500, 650, 45, (255, 200, 100)),
            (250, 1200, 55, (200, 100, 255)),
            (800, 1100, 50, (100, 255, 200)),
            (550, 1500, 65, (255, 150, 150)),
        ]
        
        for idx, (px, py, pr, pcol) in enumerate(planets):
            # 페이드인 효과
            alpha = int(200 * min((progress - idx * 0.08) * 2, 1))
            if alpha > 0:
                draw_planet(draw, px, py, pr, pcol + (alpha,), "crater")
                # 궤도선
                draw.ellipse([px-pr-10, py-pr-10, px+pr+10, py+pr+10],
                            outline=(100, 100, 100, int(alpha * 0.5)), width=1)
        
        # 제목
        txt_layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
        txt_draw = ImageDraw.Draw(txt_layer)
        for line_idx, line in enumerate(title.split("\n")):
            y_pos = 100 + line_idx * 100
            txt_draw.text((W//2, y_pos), line, font=font(85),
                         fill=(255, 220, 100, int(255 * progress)),
                         anchor="mm", stroke_width=4, stroke_fill=(0, 0, 0))
        im.alpha_composite(txt_layer)
    
    # === 여우와의 만남 ===
    elif typ == "fox":
        # 왕자와 여우
        prince_scale = 1.0 + 0.2 * math.sin(t * 2)
        draw_prince(draw, 300, 1000, prince_scale)
        
        fox_x = 700 + 50 * math.cos(t)
        draw_fox(draw, fox_x, 1000, 1.0)
        
        # 대사 풍선
        bubble_x, bubble_y = 500, 700
        draw.ellipse([bubble_x-100, bubble_y-50, bubble_x+100, bubble_y+50],
                    fill=(255, 255, 255, int(180 * progress)))
        draw.polygon([(bubble_x-30, bubble_y+50), (bubble_x, bubble_y+80), 
                     (bubble_x+20, bubble_y+50)],
                    fill=(255, 255, 255, int(180 * progress)))
        
        txt_layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
        txt_draw = ImageDraw.Draw(txt_layer)
        
        # 제목
        for line_idx, line in enumerate(title.split("\n")):
            y_pos = 150 + line_idx * 100
            txt_draw.text((W//2, y_pos), line, font=font(80),
                         fill=(200, 100, 150, int(255 * progress)),
                         anchor="mm", stroke_width=4, stroke_fill=(0, 0, 0))
        
        # 대사 (진행에 따라 나타남)
        if progress > 0.4:
            quote_alpha = int(255 * min((progress - 0.4) * 2, 1))
            txt_draw.text((bubble_x, bubble_y), "네가 길들인\n것에는\n책임이 있다",
                         font=font(50), fill=(50, 50, 50, quote_alpha),
                         anchor="mm")
        
        im.alpha_composite(txt_layer)
    
    # === 장미 ===
    elif typ == "rose":
        # 큰 장미
        rose_x, rose_y = W // 2, 700
        rose_scale = 0.5 + 0.5 * progress
        draw_rose(draw, rose_x, rose_y, rose_scale)
        
        # 주변 별들
        for _ in range(int(5 * progress)):
            ang = random.random() * 2 * math.pi
            dist = 150 + random.random() * 150
            sx = rose_x + dist * math.cos(ang)
            sy = rose_y + dist * math.sin(ang)
            draw_star(draw, sx, sy, 3)
        
        txt_layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
        txt_draw = ImageDraw.Draw(txt_layer)
        
        for line_idx, line in enumerate(title.split("\n")):
            y_pos = 150 + line_idx * 100
            txt_draw.text((W//2, y_pos), line, font=font(85),
                         fill=(255, 150, 180, int(255 * progress)),
                         anchor="mm", stroke_width=4, stroke_fill=(0, 0, 0))
        
        im.alpha_composite(txt_layer)
    
    # === 메시지 ===
    elif typ == "message":
        # 중앙에 빛나는 원
        light_r = int(150 + 100 * math.sin(t * 2))
        draw.ellipse([W//2-light_r, H//2-light_r, W//2+light_r, H//2+light_r],
                    fill=(255, 200, 100, int(80 * progress)))
        
        txt_layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
        txt_draw = ImageDraw.Draw(txt_layer)
        
        for line_idx, line in enumerate(title.split("\n")):
            y_pos = H//2 - 150 + line_idx * 150
            txt_draw.text((W//2, y_pos), line, font=font(120),
                         fill=(255, 220, 100, int(255 * progress)),
                         anchor="mm", stroke_width=6, stroke_fill=(0, 0, 0))
        
        im.alpha_composite(txt_layer)
    
    # === 아웃로 ===
    elif typ == "outro":
        fade = int(255 * (1 - progress))
        overlay = Image.new("RGBA", im.size, (0, 0, 0, fade))
        im.alpha_composite(overlay)
    
    return im.convert("RGB")

# === 배경음악 ===
def make_audio(path):
    sr, dur = 44100, DUR
    n = sr * dur
    t = np.arange(n) / sr
    out = np.zeros(n)
    
    # 감성적인 피아노 같은 음악 (Am7 코드)
    # A3, C4, E4, G4
    notes = [220, 261.63, 329.63, 392]
    
    # 12비트로 반복
    beat = 0.5
    bar = beat * 4
    
    for bar_idx in range(int(dur / bar)):
        bar_t = bar_idx * bar
        bar_start = int(bar_t * sr)
        bar_end = min(n, int((bar_idx + 1) * bar * sr))
        
        if bar_start >= n:
            break
        
        # 각 비트마다 음 하나
        for beat_idx in range(4):
            beat_t = bar_t + beat_idx * beat
            beat_start = int(beat_t * sr)
            beat_end = min(n, int((beat_t + beat * 0.8) * sr))
            
            if beat_start >= n:
                break
            
            note_idx = (bar_idx * 4 + beat_idx) % len(notes)
            fq = notes[note_idx]
            
            tt = t[beat_start:beat_end] - beat_t
            env = np.exp(-tt * 3)  # 빠른 감쇠
            out[beat_start:beat_end] += 0.08 * env * np.sin(2 * np.pi * fq * tt)
    
    # 저음 베이스
    for bar_idx in range(int(dur / bar)):
        bar_t = bar_idx * bar
        bar_start = int(bar_t * sr)
        bar_end = min(n, int((bar_idx + 1) * bar * sr))
        
        tt = t[bar_start:bar_end] - bar_t
        out[bar_start:bar_end] += 0.1 * np.sin(2 * np.pi * 110 * tt)
    
    # 페이드
    fade = int(sr * 1.5)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)
    
    out = np.clip(out / max(1e-9, np.abs(out).max()) * 0.8, -1, 1)
    pcm = (out * 32767).astype(np.int16)
    
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(pcm.tobytes())

def main():
    wav = os.path.join(HERE, "_bgm.wav")
    make_audio(wav)
    print("음악 생성 완료...")
    
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", wav,
           "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT]
    
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    total = DUR * FPS
    for fr in range(total):
        p.stdin.write(render(fr / FPS).tobytes())
        if (fr + 1) % 30 == 0:
            print(f"렌더링: {(fr+1)//30}초/{DUR}초")
    
    p.stdin.close(); p.wait()
    os.remove(wav)
    print("✓ 완료:", OUT)

if __name__ == "__main__":
    main()
