const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

/**
 * Lee un archivo .rmmzsave y devuelve el objeto JavaScript parseado.
 * El formato del juego es: pako.deflate(json, { to: "string" }) guardado como UTF-8,
 * lo que convierte los bytes >0x7F en secuencias multi-byte.
 */
function readSave(filePath) {
  const buf = fs.readFileSync(filePath);
  const str = buf.toString('utf8');
  // Revertir la codificación UTF-8: cada char → su byte original
  const bytes = Buffer.allocUnsafe(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xFF;
  }
  const json = zlib.inflateSync(bytes).toString('utf8');
  return JSON.parse(json);
}

/**
 *  Realiza un backup del save actual 
 */
function backupSave(filePath){

  const baseName = path.parse(filePath).name;
  const extension = path.parse(filePath).ext;
  const timeStamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');
  const newName = `${baseName}${timeStamp}${extension}`;
  const isPackaged = __dirname.includes('app.asar');
  const baseDir = isPackaged ? path.dirname(process.execPath) : __dirname;
  const ruteDest = path.join(baseDir, 'backups');
  const finalRute = path.join(ruteDest,newName);

  // Crear la carpeta backups en caso de que no exista
  if (!fs.existsSync(ruteDest)) {
    fs.mkdirSync(ruteDest, {recursive: true});
  }

  try {
    fs.copyFileSync(filePath, finalRute);
    console.log(`Copiado con éxito en: ${finalRute}`);
  } catch (error) {
    console.log('Error al realizar la copia:', error.message);
  }

}

/**
 * Serializa el objeto y lo guarda en el formato .rmmzsave.
 */
function writeSave(filePath, data) {
  backupSave(filePath);

  const json = JSON.stringify(data);
  const zlibBuf = zlib.deflateSync(json);
  // Cada byte del buffer → carácter latin-1 → escrito como UTF-8
  fs.writeFileSync(filePath, zlibBuf.toString('binary'), 'utf8');
}

/**
 * Devuelve el array de actores (sin el null inicial).
 */
function getActors(save) {
  return (save.actors._data || []).filter(Boolean);
}

/**
 * Devuelve el índice real en _data de un actor por su _actorId.
 */
function findActorIndex(save, actorId) {
  return (save.actors._data || []).findIndex(a => a && a._actorId === actorId);
}

module.exports = { readSave, writeSave, getActors, findActorIndex };
