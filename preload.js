const { contextBridge } = require('electron');
const { readSave, writeSave } = require('./save-utils');
const { loadGameData } = require('./game-data');
const fs = require('fs');
const path = require('path');

// Guarda el config en %APPDATA%/look-outside-editor/ — siempre escribible
const CONFIG_DIR = path.join(process.env.APPDATA, 'look-outside-editor');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function loadConfig() {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

contextBridge.exposeInMainWorld('api', {
    hasConfig: () => fs.existsSync(CONFIG_PATH),

    saveConfig: (config) => {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    },

    readSave: (slot = 1) => {
        const config = loadConfig();
        const filePath = path.join(config.savePath, `file${slot}.rmmzsave`);
        return readSave(filePath);
    },

    writeSave: (slot, data) => {
        const config = loadConfig();
        const filePath = path.join(config.savePath, `file${slot}.rmmzsave`);
        writeSave(filePath, data);
    },

    listSaves: () => {
        const config = loadConfig();
        const files = fs.readdirSync(config.savePath);
        return files.filter(f => f.match(/^file\d+\.rmmzsave$/));
    },

    gameData: () => {
        const config = loadConfig();
        return loadGameData(config.dataPath);
    }
});
