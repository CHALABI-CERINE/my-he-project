import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import _SEAL_FACTORY from 'node-seal';

// IMPORTS DES SIMULATEURS
import { analyzeStrategies } from './simulator/analyze_reductions.js';
import { simulateCKKS } from './simulator/ckks_noise_simulator.js';

// --- CONFIGURATION ES MODULES ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Important pour les gros fichiers

// DOSSIER DE SAUVEGARDE (Ta logique)
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
  console.log(`📂 Dossier créé : ${UPLOAD_DIR}`);
}

// --- INITIALISATION SEAL ---
let seal = null;
let context, evaluator, ckksEncoder;

async function initSEAL() {
  console.log("🖥️  Server: Init Crypto Engine...");
  const sealInstance = await _SEAL_FACTORY();
  seal = sealInstance;
  
  // Patch compatibilité
  if (seal.PlainText && !seal.Plaintext) seal.Plaintext = seal.PlainText;
  if (seal.CipherText && !seal.Ciphertext) seal.Ciphertext = seal.CipherText;

  const schemeType = seal.SchemeType.ckks;
  const securityLevel = seal.SecurityLevel.tc128;
  const polyModulusDegree = 8192;
  const bitSizes = [60, 40, 40, 60];

  const parms = seal.EncryptionParameters(schemeType);
  parms.setPolyModulusDegree(polyModulusDegree);
  parms.setCoeffModulus(seal.CoeffModulus.Create(polyModulusDegree, Int32Array.from(bitSizes)));

  context = seal.Context(parms, true, securityLevel);
  evaluator = seal.Evaluator(context);
  ckksEncoder = seal.CKKSEncoder(context);
  console.log("✅ Server: SEAL Ready.");
}

// --- ROUTE 1 : RESET (Vide le dossier uploads) ---
app.post('/api/reset', (req, res) => {
  try {
    if (fs.existsSync(UPLOAD_DIR)) {
      const files = fs.readdirSync(UPLOAD_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(UPLOAD_DIR, file));
      }
    }
    console.log("🗑️  Uploads folder cleared.");
    res.json({ status: 'ok' });
  } catch (err) {
    console.error("Reset error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- ROUTE 2 : UPLOAD CHUNK (Sauvegarde sur Disque) ---
// C'est la version adaptée de ton code
app.post('/api/upload-chunk', (req, res) => {
  try {
    const { index, ciphertext } = req.body;
    
    if (index === undefined || !ciphertext) {
      return res.status(400).json({ error: 'Missing index or ciphertext' });
    }

    const filePath = path.join(UPLOAD_DIR, `chunk-${index}.json`);
    // On écrit le fichier sur le disque
    fs.writeFileSync(filePath, JSON.stringify({ index, ciphertext }));
    
    // Petit log tous les 10 chunks pour pas spammer la console
    if (index % 10 === 0) console.log(`💾 Saved chunk ${index} to disk.`);
    
    res.json({ status: 'received', index });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- ROUTE 3 : COMPUTE STATS (Lit depuis le Disque) ---
app.post('/api/compute-stats', (req, res) => {
  try {
    console.log(`\n⚙️  Lecture des fichiers et Calcul...`);

    // 1. Lire tous les fichiers du dossier uploads
    const files = fs.readdirSync(UPLOAD_DIR).filter(f => f.startsWith('chunk-'));
    if (files.length === 0) return res.status(400).json({ error: "No data on disk" });

    // 2. Charger le premier fichier pour initialiser la somme
    const firstFile = JSON.parse(fs.readFileSync(path.join(UPLOAD_DIR, files[0]), 'utf8'));
    const sumCipher = seal.Ciphertext();
    sumCipher.load(context, firstFile.ciphertext);

    // 3. Additionner les autres
    for (let i = 1; i < files.length; i++) {
      const fileContent = JSON.parse(fs.readFileSync(path.join(UPLOAD_DIR, files[i]), 'utf8'));
      const nextCipher = seal.Ciphertext();
      nextCipher.load(context, fileContent.ciphertext);
      
      evaluator.add(sumCipher, nextCipher, sumCipher);
      
      // Libérer la mémoire JS (Garbage Collector hint)
      if(i % 100 === 0) global.gc && global.gc(); 
    }

    // 4. Calcul Moyenne
    const meanCipher = seal.Ciphertext();
    meanCipher.load(context, sumCipher.save());

    const plainDivisor = seal.Plaintext();
    const scale = Math.pow(2, 40);
    ckksEncoder.encode(Float64Array.from([1.0 / files.length]), scale, plainDivisor);
    
    evaluator.multiplyPlain(meanCipher, plainDivisor, meanCipher);

    console.log("✅ Calculs terminés.");
    res.json({ 
        sumCiphertext: sumCipher.save(),
        meanCiphertext: meanCipher.save()
    });

  } catch (e) {
    console.error("Computation Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// --- ROUTE SIMULATEURS ---
app.post('/api/simulate-optimizer', (req, res) => {
  const { n, slots } = req.body;
  res.json(analyzeStrategies(parseInt(n) || 1000, parseInt(slots) || 8192));
});

app.post('/api/simulate-noise', (req, res) => {
  const { data, scale } = req.body;
  if (!data) return res.status(400).json({ error: "No data" });
  res.json(simulateCKKS(data, scale || 40));
});

// --- START ---
// Port dynamique pour Azure, fallback 4000 local
const PORT = process.env.PORT || 4000;
initSEAL().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});