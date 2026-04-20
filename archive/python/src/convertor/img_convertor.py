from pathlib import Path
from typing import Final
from PIL import Image
from parser.img_parser import get_img_size

# Extensions d’images supportées par le module
IMAGE_EXTENSIONS: Final[set[str]] = {
    ".png", ".jpg", ".jpeg", ".webp"
}

# Breakpoints cibles (largeurs en pixels) pour le resize
BREAKPOINT: Final[set[int]] = {
    24, 40, 80, 160, 320, 640, 768, 1024, 1280, 1536
}

def resize_all_img(imgs: list[Path]):
    """
    Redimensionne toutes les images fournies
    selon les résolutions générées par build_all_res().
    """
    for img in imgs:
        ress = build_all_res(get_img_size(img))
        for res in ress:
            resize_and_save(img, res)

def convert_all_img(imgs: list[Path], format: str = "WEBP"):
    """
    Convertit toutes les images vers le format cible.
    """
    for img in imgs:
        convert_image_format(img, format)

def convert_image_format(
    src: Path,
    format: str,
    quality: int = 85
) -> Path:
    """
    Convertit une image vers un autre format
    en gérant la compatibilité des modes couleur.
    """
    if not src.is_file():
        raise FileNotFoundError(src)

    format = format.upper()
    output_path = src.with_suffix(f".{format.lower()}")

    with Image.open(src) as img:
        # WEBP / JPEG ne supportent pas toujours la transparence
        if format in {"JPEG", "JPG"} and img.mode in ("RGBA", "LA"):
            img = img.convert("RGB")

        img.save(output_path, format=format, quality=quality)
        print(f"Create : {output_path.stem}{output_path.suffix}")

    return output_path


def resize_and_save(
    img_path: Path,
    size: tuple[int, int]
) -> Path:
    """
    Redimensionne une image vers une taille donnée
    et sauvegarde le fichier avec un suffixe de résolution.
    """
    width, height = size

    with Image.open(img_path) as img:
        resized = img.resize((width, height), Image.LANCZOS)

        new_name = f"{width}x{height}_{img_path.stem}{img_path.suffix}"
        output_path = img_path.with_name(new_name)

        resized.save(output_path)
        print("Create : ", new_name)
    return output_path


def build_all_res(size: tuple[int, int]) -> list[tuple[int, int]]:
    """
    Génère toutes les résolutions possibles
    à partir d’une taille source, sans upscale.
    """
    width, height = size
    res: list[tuple[int, int]] = []

    for bp in BREAKPOINT:
        if bp >= width:
            continue  # pas d'upscale

        ratio = bp / width
        new_height = int(height * ratio)
        res.append((bp, new_height))

    return res



    