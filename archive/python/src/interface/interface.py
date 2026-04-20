import os
from pathlib import Path


def main_menu() -> int:
    """
    Menu principal de l’application.
    Retourne un entier correspondant au choix utilisateur.
    """
    print("[0] IMG")
    print("[3] Exit")
    choice = input(": ")
    return int(choice) if choice.isdigit() else -1

def ask_folder_path() -> str | bool:
    """
    Demande à l’utilisateur un chemin de dossier.
    input() retourne toujours une string → le bool est inutile ici.
    """
    choice = input("Copie the folder path: ")
    return str(choice) if isinstance(choice, str) else False

def clear_console():
    """
    Nettoie la console selon l’OS.
    """
    if os.name == 'nt':
        os.system('cls')
    else:
        os.system('clear')

def press_enter_to_continue():
    """
    Pause utilisateur avant de continuer,
    puis nettoyage de la console.
    """
    input("Press Enter to continue...")
    clear_console()

def choice_select_type() -> int:
    """
    Choix du mode de sélection :
    - fichier individuel
    - dossier complet
    """
    print("Do you want to select folder or file ?")
    print("[0] File")
    print("[1] Folder")
    choice = input(": ")
    return int(choice) if choice.isdigit() else -1

def choice_recursive() -> int:
    """
    Choix du mode récursif pour un dossier.
    Retourne 0 ou 1.
    """
    print("Do you want to select additional file ?")
    print("[0] Not Récursive")
    print("[1] Récursive")
    choice = input(": ")
    return int(choice) if choice.isdigit() and int(choice) < 2 else 0

def choice_select_file(imgs: list[Path]) -> int:
    """
    Affiche une liste d’images et retourne
    l’index choisi par l’utilisateur.
    """
    for i, img in enumerate(imgs):
        print(f"[{i}] {img.name}")
    
    choice = input(": ")
    return int(choice) if choice.isdigit() else -1

def choice_select_more() -> int:
    """
    Demande si l’utilisateur souhaite continuer
    à ajouter des fichiers.
    """
    print("[0] No")
    print("[1] Yes")
    choice = input(": ")
    return int(choice) if choice.isdigit() else -1