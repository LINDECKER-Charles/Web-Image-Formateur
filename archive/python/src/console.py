import os
from interface.interface import main_menu, clear_console
from orchestrator.img_orchestrator import run_img_module

def main():
    """
    Point d’entrée principal de l’application console.
    Initialise l’environnement et gère la navigation globale.
    """
    
    # Nettoyage initial de la console et message d’accueil
    clear_console()
    print("=== Dev Mates Consol Manager ===")
    print("Hii! Welcome to the Dev Mates Consol Manager.")

    # Boucle principale du menu
    while True:
        choice = main_menu()
        clear_console()
        match choice:
            case 0:
                # Accès au module image
                run_img_module()
            case 3:
                # Sortie propre de l’application
                exit(0)
            case _:
                # Choix invalide
                print("Not Found :/")

# Lancement direct du script
if __name__ == "__main__":
    main()
