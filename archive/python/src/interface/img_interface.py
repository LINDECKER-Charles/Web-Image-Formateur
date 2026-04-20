def img_menu() -> int:
    """
    Menu principal du module image.
    Retourne un entier correspondant au choix utilisateur.
    """
    print("[0] Custom Script")
    print("[1] Convert img")
    print("[2] Resize img")
    print("[3] Exit")
    choice = input(": ")
    return int(choice) if choice.isdigit() else -1

def custom_img_menu() -> int:
    """
    Menu des scripts personnalisés.
    """
    print("[0] Resize and convert into .webp")
    print("[3] Exit")
    choice = input(": ")
    return int(choice) if choice.isdigit() else -1

def choice_format() -> str:
    """
    Permet à l’utilisateur de choisir un format de sortie image.
    Retourne une string compatible Pillow.
    """
    print("[0] .webp")
    print("[1] .png")
    print("[2] .jpeg")
    choice = input(": ")
    match int(choice):
        case 0: 
            return "WEBP"
        case 1: 
            return "PNG"
        case 2: 
            return "JPEG"
    