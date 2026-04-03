#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { readSave, writeSave, getActors, findActorIndex } = require('./save-utils');
const { loadGameData } = require('./game-data');

const PARAM_NAMES = ['MaxHP', 'MaxMP', 'ATK', 'DEF', 'MAT', 'MDF', 'AGI', 'LUK'];

// ─── helpers ────────────────────────────────────────────────────────────────

function rl() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(iface, question) {
  return new Promise(resolve => iface.question(question, resolve));
}

function printActors(save) {
  const actors = getActors(save);
  console.log('\n  ID  Nombre             Lv   HP   MP   Clase');
  console.log('  ──  ─────────────────  ──  ────  ────  ────');
  for (const a of actors) {
    const name = (a._name || '(sin nombre)').padEnd(17);
    const lv = String(a._level).padStart(2);
    const hp = String(a._hp).padStart(4);
    const mp = String(a._mp).padStart(4);
    console.log(`  ${String(a._actorId).padStart(2)}  ${name}  ${lv}  ${hp}  ${mp}  ${a._classId}`);
  }
}

function printParty(save) {
  const p = save.party;
  console.log(`\n  Oro: ${p._gold}`);
  const itemCount = Object.keys(p._items || {}).length;
  const weapCount = Object.keys(p._weapons || {}).length;
  const armrCount = Object.keys(p._armors || {}).length;
  console.log(`  Items: ${itemCount} tipos  |  Armas: ${weapCount} tipos  |  Armaduras: ${armrCount} tipos`);
  console.log(`  Miembros del party: ${(p._actors || []).join(', ')}`);
}

function printHelp() {
  console.log(`
  Comandos:
    actors          — listar todos los actores
    party           — mostrar estado del party (oro, items)
    gold <n>        — establecer oro
    heal            — restaurar HP/MP de todos los actores al máximo
    level <id> <n>  — cambiar nivel de un actor (1-99)
    exp <id> <n>    — cambiar EXP de un actor
    stat <id> <param> <n>  — añadir bonus a stat (0=MaxHP 1=MaxMP 2=ATK 3=DEF 4=MAT 5=MDF 6=AGI 7=LUK)
    item <id> <n>   — establecer cantidad de un item por ID
    weapon <id> <n> — establecer cantidad de un arma por ID
    armor <id> <n>  — establecer cantidad de una armadura por ID
    save            — guardar cambios al archivo
    reload          — recargar archivo desde disco (descarta cambios)
    quit / exit     — salir sin guardar
    help            — mostrar esta ayuda
`);
}

function findIdByName(map, query) {
  for (const [id, name] of Object.entries(map)) {
    if (name.toUpperCase() === query.toUpperCase()) {
      return id;
    }
  }
  return null;
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  let filePath;
  const arg = process.argv[2];
  let dataPath;

  if (arg && isNaN(arg)) {
    filePath = arg;
  } else {
    try {
      const slot = parseInt(arg) || 1;  // si no hay arg, slot 1 por defecto
      const buf = fs.readFileSync(path.join(__dirname, 'config.json'));
      const str = buf.toString('utf8');
      const config = JSON.parse(str);// ... leer config.json
      filePath = path.join(config.savePath, `file${slot}.rmmzsave`);
      dataPath = config.dataPath;
    } catch (error) {
      console.error('ERROR: No se pudo leer el archivo config.json', error.message);
    }
  }

  let gameData = null;
  if (dataPath) {
    try {
      gameData = loadGameData(dataPath);
    } catch (error) {
      console.error('ERROR: No se pudieron leer los datos del juego correctamente :(');
    }
  }

  if (!filePath || !fs.existsSync(filePath)) {
    if (filePath) {
      console.error(`ERROR: No se encontró el archivo: ${filePath}`);
    } else {
      console.error('Uso: node editor.js [slot|ruta]');
    }
    process.exit(1);
  }

  let save = readSave(filePath);
  let dirty = false;
  console.log(`\nLook Outside Save Editor`);
  console.log(`Archivo: ${path.basename(filePath)}`);
  printParty(save);
  console.log('\nEscribe "help" para ver los comandos.\n');

  const iface = rl();

  while (true) {
    const raw = await ask(iface, dirty ? '(*)> ' : '> ');
    const parts = raw.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();

    if (!cmd) continue;

    if (cmd === 'quit' || cmd === 'exit') {
      if (dirty) {
        const confirm = await ask(iface, '¿Salir sin guardar? (s/n): ');
        if (confirm.trim().toLowerCase() !== 's') continue;
      }
      break;
    }

    if (cmd === 'help') { printHelp(); continue; }

    if (cmd === 'actors') { printActors(save); continue; }

    if (cmd === 'party') { printParty(save); continue; }

    if (cmd === 'reload') {
      if (dirty) {
        const confirm = await ask(iface, '¿Descartar cambios? (s/n): ');
        if (confirm.trim().toLowerCase() !== 's') continue;
      }
      save = readSave(filePath);
      dirty = false;
      console.log('  Archivo recargado.');
      continue;
    }

    if (cmd === 'save') {
      writeSave(filePath, save);
      dirty = false;
      console.log(`  Guardado en: ${filePath}`);
      continue;
    }

    if (cmd === 'gold') {
      const n = parseInt(parts[1]);
      if (isNaN(n) || n < 0) { console.log('  Valor inválido.'); continue; }
      save.party._gold = n;
      dirty = true;
      console.log(`  Oro → ${n}`);
      continue;
    }

    if (cmd === 'heal') {
      // RPG Maker MZ no guarda los maxHP en el save directamente (vienen de la DB),
      // pero _hp = null o un número muy alto es interpretado como "max" por el engine.
      // Ponemos un valor alto; el juego lo clampea al máximo real.
      for (const a of getActors(save)) {
        a._hp = 999999;
        a._mp = 999999;
      }
      dirty = true;
      console.log('  HP/MP de todos los actores puestos al máximo.');
      continue;
    }

    if (cmd === 'level') {
      const id = parseInt(parts[1]);
      const lv = parseInt(parts[2]);
      if (isNaN(id) || isNaN(lv) || lv < 1 || lv > 99) { console.log('  Uso: level <actorId> <1-99>'); continue; }
      const idx = findActorIndex(save, id);
      if (idx < 0) { console.log(`  Actor ${id} no encontrado.`); continue; }
      save.actors._data[idx]._level = lv;
      dirty = true;
      console.log(`  Actor ${id} → nivel ${lv}`);
      continue;
    }

    if (cmd === 'exp') {
      const id = parseInt(parts[1]);
      const exp = parseInt(parts[2]);
      if (isNaN(id) || isNaN(exp) || exp < 0) { console.log('  Uso: exp <actorId> <cantidad>'); continue; }
      const idx = findActorIndex(save, id);
      if (idx < 0) { console.log(`  Actor ${id} no encontrado.`); continue; }
      const actor = save.actors._data[idx];
      // _exp es un objeto {classId: valor}
      const classId = String(actor._classId);
      if (!actor._exp) actor._exp = {};
      actor._exp[classId] = exp;
      dirty = true;
      console.log(`  Actor ${id} → EXP[clase ${classId}] = ${exp}`);
      continue;
    }

    if (cmd === 'stat') {
      const id = parseInt(parts[1]);
      const param = parseInt(parts[2]);
      const val = parseInt(parts[3]);
      if (isNaN(id) || isNaN(param) || isNaN(val) || param < 0 || param > 7) {
        console.log(`  Uso: stat <actorId> <0-7> <valor>\n  Params: ${PARAM_NAMES.map((n, i) => i + '=' + n).join('  ')}`);
        continue;
      }
      const idx = findActorIndex(save, id);
      if (idx < 0) { console.log(`  Actor ${id} no encontrado.`); continue; }
      save.actors._data[idx]._paramPlus[param] = val;
      dirty = true;
      console.log(`  Actor ${id} → _paramPlus[${param}] (${PARAM_NAMES[param]}) = ${val}`);
      continue;
    }

    if (cmd === 'item') {
      let id;
      let nameOrId = parts.slice(1, parts.length - 1).join(' ');

      if (isNaN(nameOrId)) {
        id = findIdByName(gameData.items, nameOrId);
        if (!id) {
          console.error('No se pudo encontrar el item con ese nombre :(');
          continue;
        }
      } else {
        id = parseInt(nameOrId);
      }

      const qty = parseInt(parts[parts.length - 1]);
      if (isNaN(id) || isNaN(qty) || qty < 0) { console.log('  Uso: item <itemId> <cantidad>'); continue; }
      if (!save.party._items) save.party._items = {};
      if (qty === 0) delete save.party._items[String(id)];
      else save.party._items[String(id)] = qty;
      dirty = true;
      const name = gameData ? gameData.items[id] : null;
      console.log(`  Item ${name ? `${name} (id: ${id})` : id} → cantidad ${qty}`);
      continue;
    }

    if (cmd === 'weapon') {
      let id;
      let nameOrId = parts.slice(1, parts.length - 1).join(' ');

      if (isNaN(nameOrId)) {
        id = findIdByName(gameData.weapons, nameOrId);
        if (!id) {
          console.error('No se pudo encontrar el arma con ese nombre :(');
          continue;
        }
      } else {
        id = parseInt(nameOrId);
      }
      const qty = parseInt(parts[parts.length - 1]);
      if (isNaN(id) || isNaN(qty) || qty < 0) { console.log('  Uso: weapon <weaponId> <cantidad>'); continue; }
      if (!save.party._weapons) save.party._weapons = {};
      if (qty === 0) delete save.party._weapons[String(id)];
      else save.party._weapons[String(id)] = qty;
      dirty = true;
      const name = gameData ? gameData.weapons[id] : null;
      console.log(`  Arma ${name ? `${name} (id: ${id})` : id} → cantidad ${qty}`);
      continue;
    }

    if (cmd === 'armor') {
      let id;
      let nameOrId = parts.slice(1, parts.length - 1).join(' ');

      if (isNaN(nameOrId)) {
        id = findIdByName(gameData.armors, nameOrId);
        if (!id) {
          console.error('No se pudo encontrar la armadura con ese nombre :(');
          continue;
        }
      } else {
        id = parseInt(nameOrId);
      }
      const qty = parseInt(parts[parts.length - 1]);
      if (isNaN(id) || isNaN(qty) || qty < 0) { console.log('  Uso: armor <armorId> <cantidad>'); continue; }
      if (!save.party._armors) save.party._armors = {};
      if (qty === 0) delete save.party._armors[String(id)];
      else save.party._armors[String(id)] = qty;
      dirty = true;
      const name = gameData ? gameData.armors[id] : null;
      console.log(`  Armadura ${name ? `${name} (id: ${id})` : id} → cantidad ${qty}`);
      continue;
    }

    console.log(`  Comando desconocido: "${cmd}". Escribe "help" para ver opciones.`);
  }

  iface.close();
  console.log('Hasta luego.');
}

main().catch(e => { console.error(e); process.exit(1); });
