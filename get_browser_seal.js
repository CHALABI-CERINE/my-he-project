const fs = require('fs');
const path = require('path');
const https = require('https');

// On utilise UNPKG cette fois, avec la version 5.0.0
const fileUrl = 'https://unpkg.com/node-seal@5.0.0/dist/seal.js';
const targetPath = path.join(__dirname, 'frontend', 'public', 'seal.js');

console.log(`⬇️ Tentative de téléchargement via UNPKG (v5.0.0)...`);

const file = fs.createWriteStream(targetPath);

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
};

https.get(fileUrl, options, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    // Gestion de la redirection (souvent le cas sur unpkg)
    console.log(`🔄 Redirection vers : ${response.headers.location}`);
    https.get(response.headers.location, options, (redirectResponse) => {
        if (redirectResponse.statusCode !== 200) {
            console.error(`❌ Erreur finale: ${redirectResponse.statusCode}`);
            return;
        }
        redirectResponse.pipe(file);
        handleFinish();
    });
    return;
  }

  if (response.statusCode !== 200) {
    console.error(`❌ Erreur téléchargement: Code ${response.statusCode}`);
    return;
  }

  response.pipe(file);
  handleFinish();

}).on('error', (err) => {
  console.error(`❌ Erreur réseau: ${err.message}`);
});

function handleFinish() {
    file.on('finish', () => {
        file.close();
        console.log(`✅ SUCCÈS ! Fichier sauvegardé dans : frontend/public/seal.js`);
    });
}