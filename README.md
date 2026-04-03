# Look Outside Save Editor

A save editor for the RPG Maker MZ game **Look Outside**.

## First time setup

When you open the app for the first time, it will ask for two folder paths:

- **Save folder** — where the game stores save files. Usually:
  ```
  D:\SteamLibrary\steamapps\common\Look Outside\save
  ```
- **Game data folder** — where the game stores its data files (Items.json, Weapons.json, etc.). Usually:
  ```
  D:\SteamLibrary\steamapps\common\Look Outside\data
  ```

These paths are saved in a `config.json` file next to the executable. You only need to set them once. If you ever need to change them, delete `config.json` and restart the app.

## Features

- **Actors** — edit HP, MP, level and stat bonuses for each party member
- **Party** — edit gold and heal all party members
- **Items** — edit item quantities or add new items by name or ID
- **Gear** — edit weapon and armor quantities or add new ones by name or ID

Every time you click **Save**, a backup of the original file is created in the `backups/` folder next to the executable, just in case.

## Installation

### Requirements

- [Node.js](https://nodejs.org/) (v18 or later)
- The game **Look Outside** installed (available on Steam)

### Steps

1. Clone the repository:
   ```
   git clone https://github.com/your-username/look-outside-editor.git
   cd look-outside-editor
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the app:
   ```
   npm start
   ```

4. On first launch, enter the paths to your game's `save` and `data` folders.

## Building from source

> On Windows, run the terminal as administrator to avoid a symlink permission error during the build.

```
npm run dist
```

The output will be in `dist/Look Outside Editor 1.0.0.exe`.
