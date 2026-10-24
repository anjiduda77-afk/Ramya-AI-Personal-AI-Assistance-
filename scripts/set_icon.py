#!/usr/bin/env python3
"""
Ramya AI — App Icon Manager & Auto-Resizer
Easily set or update the app icon for both Android (all mipmap resolutions) and Desktop/Web.

Usage:
    python scripts/set_icon.py [path_to_image.png]
    
If no image path is passed, it looks for:
    - icon.png
    - app_icon.png
    - icon.jpg
in the project root directory.
"""
import sys
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

ROOT_DIR = Path(__file__).resolve().parent.parent
RES_DIR = ROOT_DIR / "apps" / "android" / "app" / "src" / "main" / "res"
DESKTOP_PUBLIC = ROOT_DIR / "apps" / "desktop" / "public"

MIPMAP_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

def create_default_orb_icon(size: int = 512) -> Image.Image:
    """Generate a sleek glowing neon cyberpunk orb icon if no image provided."""
    img = Image.new("RGBA", (size, size), (13, 21, 39, 255))
    draw = ImageDraw.Draw(img)
    
    # Outer glow circles
    center = size // 2
    for r in range(size // 2 - 20, size // 4, -4):
        alpha = int(255 * (1 - (r / (size // 2))))
        draw.ellipse([center - r, center - r, center + r, center + r], fill=(56, 189, 248, alpha // 4))
        
    # Core glowing circle
    core_r = size // 3
    draw.ellipse([center - core_r, center - core_r, center + core_r, center + core_r], fill=(2, 132, 199, 255), outline=(56, 189, 248, 255), width=size // 40)
    
    # Inner bright accent
    inner_r = size // 5
    draw.ellipse([center - inner_r, center - inner_r, center + inner_r, center + inner_r], fill=(0, 240, 255, 255))
    return img

def make_round_icon(img: Image.Image) -> Image.Image:
    """Create a circular version of an image with transparent background."""
    size = img.size
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size[0], size[1]), fill=255)
    
    output = Image.new("RGBA", size, (0, 0, 0, 0))
    output.paste(img, (0, 0))
    output.putalpha(mask)
    return output

def process_icon(input_image_path: Path = None):
    print("=" * 60)
    print("       RAMYA AI — APP ICON MANAGER & GENERATOR          ")
    print("=" * 60)
    
    if input_image_path and input_image_path.exists():
        src_path = input_image_path
        print(f"Loading custom icon from: {src_path}")
        src_img = Image.open(src_path).convert("RGBA")
    else:
        # Search for candidates in root
        candidates = ["icon.png", "app_icon.png", "icon.jpg", "icon.jpeg", "logo.png"]
        found = None
        for c in candidates:
            p = ROOT_DIR / c
            if p.exists():
                found = p
                break
        
        if found:
            print(f"Found root icon image: {found}")
            src_img = Image.open(found).convert("RGBA")
        else:
            print("No custom image provided or found in root.")
            print("Generating default high-resolution Ramya AI glowing orb icon...")
            src_img = create_default_orb_icon(512)
            # Save default to root as icon.png for user reference
            src_img.save(ROOT_DIR / "icon.png")
            print(f"Saved template icon to: {ROOT_DIR / 'icon.png'}")

    # Ensure Android res directories exist
    RES_DIR.mkdir(parents=True, exist_ok=True)
    DESKTOP_PUBLIC.mkdir(parents=True, exist_ok=True)
    
    print("\nGenerating Android Mipmap Icons:")
    for folder, size in MIPMAP_SIZES.items():
        target_dir = RES_DIR / folder
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Square launcher icon
        resized_square = src_img.resize((size, size), Image.Resampling.LANCZOS)
        square_path = target_dir / "ic_launcher.png"
        resized_square.save(square_path, "PNG")
        
        # Round launcher icon
        round_img = make_round_icon(resized_square)
        round_path = target_dir / "ic_launcher_round.png"
        round_img.save(round_path, "PNG")
        
        print(f"  + {folder:<15}: {size}x{size} px -> ic_launcher.png & ic_launcher_round.png")

    # Generate Desktop & Web Icons
    print("\nGenerating Desktop & Web Icons:")
    desktop_icon_512 = src_img.resize((512, 512), Image.Resampling.LANCZOS)
    desktop_icon_path = DESKTOP_PUBLIC / "icon.png"
    desktop_icon_512.save(desktop_icon_path, "PNG")
    print(f"  + Desktop 512x512  : {desktop_icon_path}")

    # Favicon.ico
    favicon_path = DESKTOP_PUBLIC / "favicon.ico"
    desktop_icon_512.save(favicon_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print(f"  + Web Favicon      : {favicon_path}")

    print("\n" + "=" * 60)
    print("SUCCESS: All app icons updated!")
    print("To change your icon anytime:")
    print("1. Replace 'icon.png' in this project root folder with your own picture.")
    print("2. Run 'python scripts/set_icon.py' or double-click 'change_app_icon.bat'.")
    print("=" * 60)

if __name__ == "__main__":
    arg_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    process_icon(arg_path)
