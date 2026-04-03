const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(process.env.APPDATA, 'look-outside-editor');
const CACHE_PATH = path.join(CACHE_DIR, 'cache.json');

function buildIdNameMap(jsonArray) {
    const result = {};
    
    jsonArray.filter(i => i != null)
    .forEach(i => {
        result[i.id] = i.name;
    });

    return result;
}

function loadGameData(dataDir) {
    // Si el cache ya existe, leerlo y devolverlo
    if (fs.existsSync(CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    }

    // Si no existe, leer los 3 archivos del juego
    const items   = JSON.parse(fs.readFileSync(path.join(dataDir, 'Items.json'),   'utf8'));
    const weapons = JSON.parse(fs.readFileSync(path.join(dataDir, 'Weapons.json'), 'utf8'));
    const armors  = JSON.parse(fs.readFileSync(path.join(dataDir, 'Armors.json'),  'utf8'));

    const data = {
      items:   buildIdNameMap(items),
      weapons: buildIdNameMap(weapons),
      armors:  buildIdNameMap(armors),
    };

    // Guardar el cache
    fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), 'utf8');

    return data;
  }

  module.exports = { loadGameData };

  // prueba — borrar después
//   const data = loadGameData('D:/SteamLibrary/steamapps/common/Look Outside/data');
//   console.log('Items:', Object.keys(data.items).length);
//   console.log('Weapons:', Object.keys(data.weapons).length);
//   console.log('Armors:', Object.keys(data.armors).length);
//   console.log('Ejemplo item 7:', data.items[7]);