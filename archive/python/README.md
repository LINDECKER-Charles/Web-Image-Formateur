# Dev Mates Console Manager

Console Python modulaire permettant de lancer différents outils internes Dev Mates (scripts image, parsers, automatisation). Le projet est pensé comme un **console manager extensible**, piloté par des menus successifs.

---

## 🎯 Objectif

* Centraliser plusieurs scripts techniques dans une seule interface CLI
* Naviguer simplement via des menus
* Lancer des traitements d’images (conversion, resize, batch)
* Distribuer l’outil sous forme d’archive Python autonome (`.pyz`)

---

## 🧭 Fonctionnement global

L’application repose sur une **boucle principale infinie** qui affiche un menu racine. Chaque entrée redirige vers un module spécifique.

### Boucle principale

```text
while True:
    → affichage du menu principal
    → lecture du choix utilisateur
    → dispatch vers un module
```

Actions possibles :

* Accéder au module image
* Quitter proprement l’application

---

## 🖼️ Module Image

Le module image regroupe toutes les opérations liées aux fichiers image.

### Accès

Menu principal → **Module Image**

### Structure interne

Le module image repose lui-même sur un menu secondaire (`img_menu`) qui permet de choisir le type d’action à effectuer.

#### Options disponibles

* **Script personnalisé**

  * Resize + conversion en une seule opération

* **Conversion d’images**

  * Changement de format (PNG, JPEG, WEBP, etc.)

* **Redimensionnement d’images**

  * Resize batch sans upscale

* **Retour / nettoyage console**

Chaque option appelle une fonction dédiée (`run_convert_img`, `run_resize_img`, etc.).

---

## 🧠 Logique de navigation

La navigation est entièrement pilotée par des `match/case` (Python 3.10+).

* Chaque menu retourne un entier
* Les entiers sont mappés à des actions précises
* Les entrées invalides sont gérées proprement

Cela rend la structure :

* lisible
* extensible
* robuste

---

## 🚀 Lancement de l’application

Depuis la racine du projet :

```bash
python src/console.py
```

Ou via l’archive compilée :

```bash
python dm-console-manager.pyz
```

---

## 📦 Compilation en archive Python (`.pyz`)

Le projet peut être packagé sous forme d’archive Python exécutable grâce à `zipapp`.

### Commande de compilation

À exécuter depuis la racine du projet :

```bash
python -m zipapp src -o dm-console-manager.pyz
```

### Prérequis

* Python ≥ 3.10
* `src/__main__.py` présent

`__main__.py` sert de point d’entrée et appelle la fonction `main()` du fichier `console.py`.

---

## 🧩 Dépendances

Les dépendances sont définies dans le fichier `pyproject.toml` et installables via :

```bash
pip install -e .
```

---

## 🔧 Extension du projet

Le console manager est conçu pour être extensible :

* Ajouter un module = nouveau menu + nouvelle fonction
* Aucun couplage fort entre les modules
* Idéal pour intégrer d’autres outils (parsers, audits, automations)

---

## ✅ En résumé

* Interface console modulaire
* Navigation par menus hiérarchiques
* Outils image intégrés
* Distribution simple via `.pyz`
* Base saine pour un toolbox Python interne


venv\Scripts\Activate.ps1

python -m pip install .
