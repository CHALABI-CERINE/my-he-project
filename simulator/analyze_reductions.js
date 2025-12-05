const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
// Coûts relatifs estimés (basés sur benchmarks CKKS réels)
const COSTS = {
    ADD: 1,         // Coût de base
    ROTATE: 25,     // Une rotation coûte ~25x plus cher qu'une addition
    SETUP: 100      // Coût fixe d'init
};

// --- ALGORITHMES DE RÉDUCTION ---

/**
 * 1. MÉTHODE BINAIRE (BASELINE)
 * Stratégie classique "Log N". On plie le vecteur en deux récursivement.
 * Rotations nécessaires : log2(N).
 */
function strategyBinary(numSlots) {
    let rotations = 0;
    let adds = 0;
    let steps = [];
    
    let currentSize = numSlots;
    
    while (currentSize > 1) {
        const shift = Math.floor(currentSize / 2);
        rotations++; // Rotate(shift)
        adds++;      // Add(Cipher, RotatedCipher)
        steps.push(`Rotate(${shift}) -> Add`);
        currentSize = shift;
    }

    return { name: "Binary Tree", rotations, adds, steps };
}

/**
 * 2. MÉTHODE SÉQUENTIELLE (NAIVE)
 * Pire cas : on décale de 1, on ajoute, on répète.
 * Rotations : N-1. (Interdit en prod, juste pour comparer)
 */
function strategySequential(numSlots) {
    let rotations = 0;
    let adds = 0;
    
    for (let i = 0; i < numSlots - 1; i++) {
        rotations++;
        adds++;
    }
    return { name: "Sequential (Naive)", rotations, adds, steps: ["N-1 Rotations (Bad)"] };
}

/**
 * 3. BLOCK-WISE REDUCTION (HYBRIDE)
 * On divise N en blocs de taille B.
 * - On réduit d'abord à l'intérieur des blocs (Inner).
 * - Puis on réduit les résultats des blocs (Outer).
 * Utile si N est très grand et dépasse la capacité batching optimale.
 */
function strategyBlockWise(numSlots, blockSize) {
    if (numSlots % blockSize !== 0) {
        return { name: `Block-Wise (B=${blockSize})`, error: "Invalid Block Size" };
    }

    const numBlocks = numSlots / blockSize;
    
    // Coût Interne (dans chaque bloc en parallèle) : Binary sur taille B
    const innerCost = strategyBinary(blockSize);
    
    // Coût Externe (entre les blocs) : Binary sur le nombre de blocs
    // Il faut faire des rotations géantes pour aligner les blocs
    const outerCost = strategyBinary(numBlocks);

    return {
        name: `Block-Wise (Block=${blockSize})`,
        rotations: innerCost.rotations + outerCost.rotations,
        adds: innerCost.adds + outerCost.adds,
        steps: [`Inner: ${blockSize} items`, `Outer: ${numBlocks} blocks`]
    };
}

// --- ANALYSE ---

function runAnalysis() {
    console.log("📊 --- ANALYSE DES STRATÉGIES DE RÉDUCTION CKKS ---\n");

    // Scénarios de taille de slots (batching size)
    const scenarios = [8, 128, 4096, 8192, 16384];

    const results = [];

    scenarios.forEach(N => {
        console.log(`\n🔹 SCÉNARIO: Vecteur de taille N = ${N}`);
        
        // 1. Binary
        const bin = strategyBinary(N);
        const scoreBin = (bin.rotations * COSTS.ROTATE) + bin.adds;
        
        results.push({ N, method: bin.name, rotations: bin.rotations, adds: bin.adds, score: scoreBin });
        console.log(`   [Binary]     Rotations: ${bin.rotations}\t Score: ${scoreBin}`);

        // 2. Block-Wise (Test avec différentes tailles de blocs)
        // On essaie des diviseurs de N comme taille de bloc
        const blockSizes = [4, 8, 16, 32].filter(b => b < N);
        
        blockSizes.forEach(b => {
            const block = strategyBlockWise(N, b);
            const scoreBlock = (block.rotations * COSTS.ROTATE) + block.adds;
            results.push({ N, method: block.name, rotations: block.rotations, adds: block.adds, score: scoreBlock });
            
            // Comparaison visuelle simple
            const diff = scoreBlock - scoreBin;
            const tag = diff > 0 ? "❌ Slower" : (diff < 0 ? "✅ Faster" : "⏸️ Equal");
            console.log(`   [Block ${b}]\t Rotations: ${block.rotations}\t Score: ${scoreBlock} \t${tag}`);
        });
    });

    // Export JSON
    const outputDir = path.join(__dirname, 'outputs');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    
    const filename = path.join(outputDir, `analysis_${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n💾 Résultats sauvegardés dans: ${filename}`);
    
    // RECOMMANDATION FINALE
    console.log("\n🏆 RECOMMANDATION :");
    console.log("La méthode BINAIRE (Log2) est mathématiquement optimale pour un vecteur plein.");
    console.log("Cependant, la méthode BLOCK-WISE est cruciale si N > PolyModulusDegree (ex: N=100,000).");
}

runAnalysis();