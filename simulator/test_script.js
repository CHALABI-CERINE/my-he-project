const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:4000/api';
const TOTAL_VALUES = 100; // On teste avec 100 valeurs pour commencer
const CHUNK_SIZE = 10;    // On envoie par paquets de 10

// Générer des fausses données (Data Generation)
const data = Array.from({ length: TOTAL_VALUES }, () => Math.floor(Math.random() * 100));
console.log(`📊 Données générées : ${data.length} valeurs.`);
console.log(`👀 Exemple: ${data.slice(0, 5)}...`);

async function runTest() {
    try {
        // 1. Reset du serveur
        console.log("\n1️⃣ Reset du backend...");
        await axios.post(`${API_URL}/reset`);

        // 2. Découpage et Envoi (Simulation du Client React)
        console.log("\n2️⃣ Envoi des chunks...");
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);
            const chunkIndex = i / CHUNK_SIZE;
            
            await axios.post(`${API_URL}/upload-chunk`, {
                chunkIndex: chunkIndex,
                values: chunk // Ici on envoie en CLAIR pour l'instant (Stub)
            });
            process.stdout.write('.'); // Barre de progression minimaliste
        }
        console.log("\n✅ Tous les chunks envoyés !");

        // 3. Demander le calcul
        console.log("\n3️⃣ Demande de calcul de moyenne...");
        const response = await axios.post(`${API_URL}/compute-average`);
        
        console.log("------------------------------------------------");
        console.log(`🎉 RÉSULTAT REÇU DU SERVEUR : ${response.data.result}`);
        
        // Vérification locale
        const realSum = data.reduce((a, b) => a + b, 0);
        const realAvg = realSum / data.length;
        console.log(`🤖 VÉRIFICATION LOCALE     : ${realAvg}`);
        
        if (Math.abs(response.data.result - realAvg) < 0.001) {
            console.log("✅ TEST RÉUSSI : Les moyennes correspondent !");
        } else {
            console.log("❌ ERREUR : Différence trouvée.");
        }
        console.log("------------------------------------------------");

    } catch (error) {
        console.error("❌ Erreur pendant le test :", error.message);
    }
}

runTest();