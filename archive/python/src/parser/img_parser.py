from pathlib import Path
from typing import Final
from PIL import Image

from interface.interface import ask_folder_path, choice_select_file, choice_select_more

# Extensions d’images supportées par le module
# Set pour test d’appartenance en O(1)
IMAGE_EXTENSIONS: Final[set[str]] = {
    ".png", ".jpg", ".jpeg", ".webp"
}

def get_folder_path(folder: str) -> Path | bool:
    """
    Convertit une chaîne en Path et vérifie son existence.
    Retourne :
    - Path valide si existant
    - False sinon (contrôle utilisateur)
    """
    try:
        path = Path(folder)
        if path.exists():
            return path
        print(f"Invalid path ! Retry !")
        return False
    except Exception as e:
        # Cas très rares (car Path() est tolérant),
        # mais garde une barrière de sécurité
        print(f"Invalid path ! Retry !")
        return False

def get_img_list(folder: Path, recursive: bool = False) -> list[Path] | bool:
    """
    Retourne la liste des images d’un dossier.
    - recursive = False → parcours direct
    - recursive = True  → parcours récursif
    """
    try:
        if not folder.is_dir():
            raise ValueError(f"Dossier invalide : {folder}")

        iterator = folder.rglob("*") if recursive else folder.iterdir()
        
        return [
            f for f in iterator
            if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS
        ]
    except ValueError as e:
        # Erreur métier : dossier invalide
        print(e)
        return False

def get_img_size(file: Path) -> tuple[int, int]:
    """
    Retourne la taille (width, height) d’une image.
    Utilise Pillow sans charger l’image complète en mémoire.
    """
    if not file.is_file():
        raise ValueError(f"Dossier invalide : {file}")
    with Image.open(file) as img:
        width, height = img.size
        return width, height

def select_file(imgs_list: list[Path]) -> list[Path]:
    """
    Permet à l’utilisateur de sélectionner manuellement
    plusieurs images depuis une liste.
    - Les images sélectionnées sont retirées de la liste source
    - La boucle s’arrête si l’utilisateur refuse d’ajouter plus
    """
    imgs_selected: list[Path] = []
    while True:
        choice: int = choice_select_file(imgs_list)
        print(f"ADD : {imgs_list[choice]}")
        imgs_selected.append(imgs_list[choice])
        imgs_list.pop(choice)
        if(imgs_list):
            if(not bool(choice_select_more())):
                break
        else:
            break
    return imgs_selected

def ask_valid_folder() -> Path:
    """
    Boucle de validation utilisateur.
    Ne retourne que lorsque le dossier est valide.
    """
    while True :
        folder_path = get_folder_path(ask_folder_path())
        if(folder_path):
            return folder_path