import os
from PIL import Image, ImageDraw, ImageFilter

def create_icon(size):
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    pad = int(size * 0.08)
    w = size - 2 * pad
    h = size - 2 * pad
    
    # Outer shield polygon coordinates
    cx = size / 2
    top = pad + int(size * 0.05)
    bottom = size - pad - int(size * 0.05)
    left = pad
    right = size - pad
    
    # Shield shape points
    points = [
        (cx, top),
        (right, top + int(h * 0.2)),
        (right, top + int(h * 0.55)),
        (cx, bottom),
        (left, top + int(h * 0.55)),
        (left, top + int(h * 0.2))
    ]
    
    # Draw background shield shadow/glow
    shadow_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_img)
    shadow_points = [(p[0], p[1] + int(size*0.03)) for p in points]
    shadow_draw.polygon(shadow_points, fill=(0, 0, 0, 100))
    shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(radius=max(1, size/20)))
    
    img.paste(shadow_img, (0, 0), shadow_img)
    
    # Base Shield
    draw.polygon(points, fill=(15, 23, 42, 255))
    
    # Inner gradient shield
    inset = max(1, int(size * 0.06))
    inner_points = [
        (cx, top + inset * 1.5),
        (right - inset, top + int(h * 0.2) + inset * 0.5),
        (right - inset, top + int(h * 0.55) - inset * 0.5),
        (cx, bottom - inset * 1.5),
        (left + inset, top + int(h * 0.55) - inset * 0.5),
        (left + inset, top + int(h * 0.2) + inset * 0.5)
    ]
    draw.polygon(inner_points, fill=(30, 41, 59, 255))
    
    # Lightning Bolt Symbol in Center
    play_cy = top + (bottom - top) * 0.45
    psize = size * 0.28
    
    bolt_points = [
        (cx + psize*0.1, play_cy - psize*0.9),
        (cx - psize*0.6, play_cy + psize*0.1),
        (cx - psize*0.05, play_cy + psize*0.1),
        (cx - psize*0.3, play_cy + psize*0.9),
        (cx + psize*0.5, play_cy - psize*0.1),
        (cx - psize*0.05, play_cy - psize*0.1)
    ]
    draw.polygon(bolt_points, fill=(6, 182, 212, 255))
    
    # Glowing cyan highlight outline
    draw.polygon(points, outline=(56, 189, 248, 255), width=max(1, int(size * 0.04)))
    
    return img

def main():
    os.makedirs('icons', exist_ok=True)
    sizes = [16, 32, 48, 128]
    for s in sizes:
        icon = create_icon(s)
        icon.save(f'icons/icon{s}.png')
        print(f'Generated icons/icon{s}.png')

if __name__ == '__main__':
    main()
