import SEAL from 'node-seal';

let seal = null;
let context = null;
let keyGenerator = null;
let secretKey = null;
let publicKey = null;
let encryptor = null;
let decryptor = null;
let ckksEncoder = null;
let evaluator = null;

/**
 * Initialise la librairie SEAL (WASM), configure le contexte CKKS et génère les clés.
 * @param {number} polyModulusDegree - Degré du polynôme (défaut 8192)
 * @param {number} scaleBits - Précision en bits (défaut 40)
 * @returns {Promise<boolean>} - true si succès, false sinon
 */
export async function initSEALAndKeys(polyModulusDegree = 8192, scaleBits = 40) {
    try {
        // Charge le module WASM
        const _seal = await SEAL();
        seal = _seal;

        const schemeType = seal.SchemeType.ckks;
        const securityLevel = seal.SecurityLevel.tc128;
        
        const parms = seal.EncryptionParameters(schemeType);
        parms.setPolyModulusDegree(polyModulusDegree);
        
        // Configuration des modules : [60, 40, 40, 60] est standard pour 8192
        const bitSizes = [60, scaleBits, scaleBits, 60];
        parms.setCoeffModulus(seal.CoeffModulus.Create(polyModulusDegree, Int32Array.from(bitSizes)));

        // Crée le contexte
        context = seal.Context(parms, true, securityLevel);

        if (!context.parametersSet()) {
            throw new Error("Paramètres de cryptage invalides ou insécurisés.");
        }

        // Génération des clés
        keyGenerator = seal.KeyGenerator(context);
        secretKey = keyGenerator.secretKey();
        publicKey = keyGenerator.createPublicKey();
        
        // Utilitaires
        evaluator = seal.Evaluator(context);
        ckksEncoder = seal.CKKSEncoder(context);
        encryptor = seal.Encryptor(context, publicKey);
        decryptor = seal.Decryptor(context, secretKey);

        console.log("🔒 SEAL Client Initialisé avec succès.");
        return true;
    } catch (e) {
        console.error("Erreur critique init SEAL:", e);
        return false;
    }
}

/**
 * Chiffre un nombre ou un tableau de nombres en Base64 (CKKS)
 * @param {number|number[]} valueOrArray - Données à chiffrer
 * @param {number} scaleBits - Échelle (défaut 40)
 * @returns {string} - Ciphertext encodé en Base64
 */
export function encryptData(valueOrArray, scaleBits = 40) {
    if (!seal || !encryptor || !ckksEncoder) {
        throw new Error("Erreur: SEAL n'est pas encore initialisé. Attendez le statut 'PRÊT'.");
    }

    // Normalise l'entrée en tableau
    const inputArray = Array.isArray(valueOrArray) ? valueOrArray : [valueOrArray];

    // Création des objets SEAL via la factory de l'instance
    const plain = seal.Plaintext();
    const scale = Math.pow(2, scaleBits);
    
    // 1. Encodage (Vecteur -> Plaintext)
    ckksEncoder.encode(Float64Array.from(inputArray), scale, plain);

    // 2. Chiffrement (Plaintext -> Ciphertext)
    const cipher = seal.Ciphertext();
    encryptor.encrypt(plain, cipher);

    // 3. Export Base64
    return cipher.save(); 
}

/**
 * Déchiffre une string Base64 et retourne le tableau de nombres flottants
 * @param {string} cipherBase64 - Ciphertext en Base64
 * @returns {Float64Array} - Tableau des valeurs déchiffrées
 */
export function decryptResult(cipherBase64) {
    if (!seal || !decryptor || !ckksEncoder) {
        throw new Error("Erreur: SEAL n'est pas initialisé (decrypt impossible).");
    }

    try {
        const cipher = seal.Ciphertext();
        cipher.load(context, cipherBase64);

        const plain = seal.Plaintext();
        decryptor.decrypt(cipher, plain);

        const decoded = ckksEncoder.decode(plain);
        return decoded;
    } catch (e) {
        console.error("Erreur déchiffrement:", e);
        throw e;
    }
}
