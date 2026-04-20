from pathlib import Path
# Parsers : récupération et validation des chemins / fichiers
from parser.img_parser import ask_valid_folder, get_img_list, select_file
# Convertisseurs : traitements lourds sur les images
from convertor.img_convertor import resize_all_img, convert_all_img
# Interface console générique
from interface.interface import choice_recursive, choice_select_type, clear_console, press_enter_to_continue
# Interface spécifique aux images
from interface.img_interface import img_menu, custom_img_menu, choice_format

def run_img_module():
    """
    Point d’entrée du module image.
    Gère la navigation principale du menu image.
    """
    while True:
        choice = img_menu()
        clear_console()
        match choice:
            case 0:
                # Menu personnalisé (resize + convert)
                choice = custom_img_menu()
                match choice:
                    case 0:
                        run_script_resize_convert()
                    case 3:
                        clear_console()
            case 1:
                run_convert_img()
            case 2:
                run_resize_img()
            case 3:
                break
                
    

def run_resize_img():
    """
    Workflow de redimensionnement d’images.
    L’utilisateur peut choisir :
    - traitement récursif d’un dossier
    - ou sélection manuelle de fichiers
    """
    if(choice_select_type()):
        # Mode dossier (optionnellement récursif)
        recursive: bool = bool(choice_recursive())
        folder_path: Path = ask_valid_folder()
        resize_all_img(get_img_list(folder_path, recursive))
    else:
        # Mode sélection manuelle de fichiers
        folder_path: Path = ask_valid_folder()
        imgs_list: list[Path] = get_img_list(folder_path)
        imgs_selected: list[Path] = select_file(imgs_list)
        resize_all_img(imgs_selected)
    
    press_enter_to_continue()

def run_convert_img():
    """
    Workflow de conversion d’images vers un format cible.
    Même logique que le resize : dossier ou sélection manuelle.
    """
    format = choice_format()
    if(choice_select_type()):
        recursive: bool = bool(choice_recursive())
        folder_path: Path = ask_valid_folder()
        convert_all_img(get_img_list(folder_path, recursive), format)
    else:
        folder_path: Path = ask_valid_folder()
        imgs_list: list[Path] = get_img_list(folder_path)
        imgs_selected: list[Path] = select_file(imgs_list)
        
        convert_all_img(imgs_selected, format)
        
    press_enter_to_continue()
    
def run_script_resize_convert():
    """
    Workflow combiné :
    - redimensionnement
    - puis conversion en WEBP
    Appliqué sur un dossier (optionnellement récursif).
    """
    folder_path: Path = ask_valid_folder()
    recursive: bool = bool(choice_recursive())
    resize_all_img(get_img_list(folder_path, recursive))
    convert_all_img(get_img_list(folder_path, recursive), "WEBP")
    press_enter_to_continue()