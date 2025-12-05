const fs = require('fs');
const path = require('path');
const https = require('https');

// URLs officielles (CDN JSDelivr qui est très stable)
const FILES = {
    'seal.js': 'https://cdn.jsdelivr.net/npm/node-seal@5.0.0/dist/seal.js',
    'seal.wasm': 'https://cdn.jsdelivr.net/npm/node-seal@5.0.0/dist/seal.wasm'
};

const OUTPUT_DIR = path.join(__dirname, 'frontend', 'public');

// Création du dossier si inexistant
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function downloadFile(filename, url) {
    const filePath = path.join(OUTPUT_DIR, filename);
    const file = fs.createWriteStream(filePath);

    console.log(`⬇️  Téléchargement de ${filename}...`);

    https.get(url, (response) => {
        // Gestion des redirections (301/302)
        if (response.statusCode === 301 || response.statusCode === 302) {
            downloadFile(filename, response.headers.location);
            return;
        }

        if (response.statusCode !== 200) {
            console.error(`❌ Échec ${filename}: Code ${response.statusCode}`);
            file.close();
            fs.unlinkSync(filePath); // Supprime le fichier vide
            return;
        }

        response.pipe(file);

        file.on('finish', () => {
            file.close();
            const stats = fs.statSync(filePath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            console.log(`✅ ${filename} terminé ! (${sizeKB} KB)`);
        });
    }).on('error', (err) => {
        fs.unlinkSync(filePath);
        console.error(`❌ Erreur réseau pour ${filename}: ${err.message}`);
    });
}

console.log("🚀 Démarrage du téléchargement de secours...");
downloadFile('seal.js', FILES['seal.js']);
downloadFile('seal.wasm', FILES['seal.wasm']);