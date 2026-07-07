import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno del archivo .env manualmente
function loadEnv() {
  const envPath = path.resolve('.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split(/\r?\n/).forEach(line => {
    // Ignorar comentarios y líneas vacías
    if (line.trim().startsWith('#') || !line.includes('=')) return;
    const [key, ...val] = line.split('=');
    process.env[key.trim()] = val.join('=').trim();
  });
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar definidos en el archivo .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BACKUP_DIR = './supabase_storage_backup';

// Función para obtener todos los archivos de un directorio de forma recursiva
function getLocalFiles(dirPath, originalPath = dirPath) {
  let results = [];
  const list = fs.readdirSync(dirPath);
  
  list.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(getLocalFiles(fullPath, originalPath));
    } else {
      // Obtener la ruta relativa con respecto al originalPath (que será BACKUP_DIR/bucket_name)
      const relativePath = path.relative(originalPath, fullPath).replace(/\\/g, '/');
      results.push({
        fullPath,
        relativePath
      });
    }
  });
  
  return results;
}

async function uploadFile(bucketName, localFilePath, remotePath) {
  console.log(`Subiendo a [${bucketName}]: ${remotePath}...`);
  const fileBuffer = fs.readFileSync(localFilePath);
  
  const ext = path.extname(localFilePath).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.pdf') contentType = 'application/pdf';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.svg') contentType = 'image/svg+xml';
  else if (ext === '.webp') contentType = 'image/webp';
  else if (ext === '.txt') contentType = 'text/plain';
  else if (ext === '.zip') contentType = 'application/zip';

  // Determinar content-type básico o dejar que Supabase lo auto-detecte
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(remotePath, fileBuffer, {
      contentType,
      upsert: true
    });

  if (error) {
    console.error(`Error al subir ${remotePath} al bucket "${bucketName}":`, error.message);
  } else {
    console.log(`Subido con éxito: ${remotePath}`);
  }
}

async function main() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.error(`Error: No se encontró la carpeta de backup en "${BACKUP_DIR}".`);
    process.exit(1);
  }

  const bucketsToUpload = fs.readdirSync(BACKUP_DIR);
  console.log(`Detectados ${bucketsToUpload.length} buckets en la carpeta de backup.`);

  for (const bucketName of bucketsToUpload) {
    const bucketDirPath = path.join(BACKUP_DIR, bucketName);
    
    if (!fs.statSync(bucketDirPath).isDirectory()) continue;

    console.log(`Procesando subida para el bucket: "${bucketName}"...`);

    // Asegurarse de que el bucket existe en la cuenta de destino (por si acaso no corrieron migraciones)
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === bucketName);

    if (!bucketExists) {
      console.log(`El bucket "${bucketName}" no existe en el destino. Creándolo...`);
      // Crearlo como público o privado dependiendo del nombre (según convención)
      const isPublic = ['fotos-perfil', 'logos'].includes(bucketName);
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: isPublic
      });
      if (error) {
        console.error(`No se pudo crear el bucket "${bucketName}":`, error.message);
        continue;
      }
    }

    const files = getLocalFiles(bucketDirPath);
    console.log(`Subiendo ${files.length} archivos a "${bucketName}"...`);

    for (const file of files) {
      await uploadFile(bucketName, file.fullPath, file.relativePath);
    }
  }

  console.log('¡Proceso de restauración de archivos en storage completado con éxito!');
}

main().catch(err => {
  console.error('Error crítico en la subida:', err);
});
