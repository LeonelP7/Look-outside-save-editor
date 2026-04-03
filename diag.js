const fs = require('fs');
const zlib = require('zlib');
const LZString = require('lz-string');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
  console.log('Uso: node diag.js <ruta-al-archivo.rmmzsave>');
  process.exit(1);
}

const outputDir = __dirname;

const buf = fs.readFileSync(filePath);
console.log(`\nArchivo: ${path.basename(filePath)}`);
console.log(`Tamaño: ${buf.length} bytes`);
console.log(`Primeros 16 bytes (hex): ${[...buf.slice(0,16)].map(b=>b.toString(16).padStart(2,'0')).join(' ')}`);
console.log(`Primeros 4 bytes (decimal): ${[...buf.slice(0,4)].join(', ')}`);

// Detectar magic bytes conocidos
const magic = buf.slice(0, 2).toString('hex');
if (magic === '7801' || magic === '789c' || magic === '78da') {
  console.log(`\n→ Magic bytes "${magic}" detectados: esto es ZLIB (deflate)`);
} else if (buf.slice(0, 2).toString('hex') === '1f8b') {
  console.log(`\n→ Magic bytes "1f8b" detectados: esto es GZIP`);
} else {
  console.log(`\n→ Magic bytes desconocidos: ${magic}`);
}

// Distintas formas de convertir a string (para LZ-string)
const latin1 = buf.toString('latin1');
const utf8   = buf.toString('utf8');
const utf16le = buf.toString('utf16le');

function tryResult(name, fn) {
  try {
    const result = fn();
    const str = Buffer.isBuffer(result) ? result.toString('utf8') : result;
    if (str && str.length > 10) {
      const preview = str.slice(0, 200);
      const isJson = preview.trimStart().startsWith('{') || preview.trimStart().startsWith('[');
      console.log(`\n✓ EXITO: ${name}`);
      console.log(`  Longitud descomprimida: ${str.length} chars`);
      console.log(`  Preview: ${preview}`);
      if (isJson) {
        try {
          const parsed = JSON.parse(str);
          console.log(`  → JSON válido parseado`);
          console.log(`  Gold: ${parsed.gold}`);
          console.log(`  Actors: ${parsed.actors?.length}`);
          console.log(`  Variables: ${parsed.variables?.length}`);
          // Guardar el JSON descomprimido para inspección
          const outPath = path.join(outputDir, path.basename(filePath) + '.decoded.json');
          fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2), 'utf8');
          console.log(`  → Guardado en: ${outPath}`);
        } catch(e) {
          console.log(`  (no es JSON válido completo, pero tiene contenido)`);
          const outPath = path.join(outputDir, path.basename(filePath) + '.decoded.txt');
          fs.writeFileSync(outPath, str, 'utf8');
          console.log(`  → Guardado en: ${outPath}`);
        }
      }
    } else {
      console.log(`✗ ${name}: resultado vacío o nulo`);
    }
  } catch(e) {
    console.log(`✗ ${name}: error — ${e.message}`);
  }
}

// Cuando pako usa { to: "string" }, escribe el binario como string JS.
// Al guardarse con UTF-8, los bytes >0x7F se codifican como 2 bytes (c2 xx / c3 xx).
// Para revertirlo: leer como UTF-8 → char codes → Buffer.
const strUtf8 = buf.toString('utf8');
const rebuildBuf = () => {
  const arr = new Uint8Array(strUtf8.length);
  for (let i = 0; i < strUtf8.length; i++) arr[i] = strUtf8.charCodeAt(i) & 0xFF;
  return Buffer.from(arr);
};

console.log('\n--- Intentos ZLIB (raw buffer) ---');
tryResult('zlib.inflateSync',      () => zlib.inflateSync(buf));
tryResult('zlib.gunzipSync',       () => zlib.gunzipSync(buf));
tryResult('zlib.inflateRawSync',   () => zlib.inflateRawSync(buf));
tryResult('zlib.unzipSync',        () => zlib.unzipSync(buf));

console.log('\n--- Intentos ZLIB (pako string→Buffer, reconstruido desde UTF-8) ---');
const rebuilt = rebuildBuf();
console.log(`  Primeros bytes reconstruidos: ${[...rebuilt.slice(0,8)].map(b=>b.toString(16).padStart(2,'0')).join(' ')}`);
tryResult('zlib.inflateSync (rebuilt)',    () => zlib.inflateSync(rebuilt));
tryResult('zlib.inflateRawSync (rebuilt)', () => zlib.inflateRawSync(rebuilt));
tryResult('zlib.gunzipSync (rebuilt)',     () => zlib.gunzipSync(rebuilt));
tryResult('zlib.unzipSync (rebuilt)',      () => zlib.unzipSync(rebuilt));

console.log('\n--- Intentos LZ-String ---');
tryResult('decompress(latin1)',                  () => LZString.decompress(latin1));
tryResult('decompress(utf8)',                    () => LZString.decompress(utf8));
tryResult('decompress(utf16le)',                 () => LZString.decompress(utf16le));
tryResult('decompressFromUTF16(latin1)',         () => LZString.decompressFromUTF16(latin1));
tryResult('decompressFromUTF16(utf8)',           () => LZString.decompressFromUTF16(utf8));
tryResult('decompressFromBase64(latin1)',        () => LZString.decompressFromBase64(latin1));
tryResult('decompressFromBase64(utf8)',          () => LZString.decompressFromBase64(utf8));
tryResult('decompressFromEncodedURIComponent',   () => LZString.decompressFromEncodedURIComponent(latin1));