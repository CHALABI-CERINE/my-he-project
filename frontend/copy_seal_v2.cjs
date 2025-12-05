const fs = require('fs');
const path = require('path');

// Recherche dans frontend et backend
const roots = [
    path.join(__dirname, 'node_modules', 'node-seal'),
    path.join(__dirname, '../backend/node_modules', 'node-seal')
];

const sourceDir = roots.find(dir => fs.existsSync(dir));

if (!sourceDir) {
    console.error("❌ Dossier node-seal introuvable.");
    process.exit(1);
}

console.log(`📍 Source: ${sourceDir}`);
const destDir = path.join(__dirname, 'public');

// LE FICHIER MIRACLE : Pas de WASM nécessaire !
const jsFile = 'allows_js_web_umd.js';
const src = path.join(sourceDir, jsFile);
const dest = path.join(destDir, 'seal.js');

if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✅ SUCCÈS: Version Pure JS installée (public/seal.js)`);
    
    // On supprime le WASM s'il traîne, pour éviter la confusion
    const wasmPath = path.join(destDir, 'seal.wasm');
    if (fs.existsSync(wasmPath)) {
        fs.unlinkSync(wasmPath);
        console.log("🗑️  Fichier seal.wasm supprimé (inutile maintenant).");
    }
} else {
    console.error(`❌ Impossible de trouver ${jsFile}`);
}