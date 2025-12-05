const fs = require('fs');
const path = require('path');

// Configuration
const COUNT = process.argv[2] ? parseInt(process.argv[2]) : 1000000; // 1 Million par défaut
const FILENAME = process.argv[3] || 'big_data_1M.csv';
const OUTPUT_DIR = path.join(__dirname, '../data'); // On met ça dans un dossier 'data' à la racine

// Création du dossier si inexistant
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const filePath = path.join(OUTPUT_DIR, FILENAME);
const stream = fs.createWriteStream(filePath);

console.log(`🚀 Démarrage de la génération de ${COUNT.toLocaleString()} lignes...`);
console.time("Temps de génération");

// En-tête CSV (optionnel, mais propre)
// stream.write('value\n'); // Décommente si tu veux un header "value"

function generate() {
    let i = COUNT;
    let canWrite = true;

    // Fonction d'écriture optimisée (évite la saturation mémoire)
    function write() {
        while (i > 0 && canWrite) {
            i--;
            // Génère un nombre aléatoire réaliste (ex: entre 0.00 et 10000.00)
            const num = (Math.random() * 10000).toFixed(4);
            
            // Ajouter saut de ligne sauf pour le dernier
            const data = (i === 0) ? num : num + '\n';

            canWrite = stream.write(data);
        }
        
        if (i > 0) {
            // Le buffer est plein, on attend qu'il se vide
            stream.once('drain', () => {
                canWrite = true;
                write();
            });
        } else {
            stream.end();
            console.timeEnd("Temps de génération");
            console.log(`✅ Fichier créé : ${filePath}`);
            
            // Afficher la taille du fichier
            const stats = fs.statSync(filePath);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(`📦 Taille : ${sizeMB} MB`);
        }
    }

    write();
}

generate();