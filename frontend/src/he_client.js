import SEAL from 'node-seal';

// Variables privées (Module Scope)
let sealInstance = null; // Renommé pour éviter la confusion
let context = null;
let encryptor = null;
let decryptor = null;
let ckksEncoder = null;
let keyGenerator = null;
let secretKey = null;
let publicKey = null;

// Configuration pour 1M de données (Performance max)
const POLY_MODULUS_DEGREE = 8192; // Permet 4096 slots par ciphertext
const BIT_SIZES = [60, 40, 40, 60]; 

export async function initSEALAndKeys() {
    try {
        // 1. Chargement de la librairie WASM
        const _seal = await SEAL();
        sealInstance = _seal; // On stocke l'instance ici

        // 2. Vérification critique immédiate
        if (!sealInstance.Plaintext) {
            throw new Error("L'objet SEAL a été chargé mais ne contient pas les constructeurs (Plaintext manquant).");
        }

        // 3. Création des paramètres
        const schemeType = sealInstance.SchemeType.ckks;
        const securityLevel = sealInstance.SecurityLevel.tc128;
        const parms = sealInstance.EncryptionParameters(schemeType);
        
        parms.setPolyModulusDegree(POLY_MODULUS_DEGREE);
        parms.setCoeffModulus(
            sealInstance.CoeffModulus.Create(POLY_MODULUS_DEGREE, Int32Array.from(BIT_SIZES))
        );

        // 4. Création du Contexte
        context = sealInstance.Context(parms, true, securityLevel);
        
        if (!context.parametersSet()) {
            throw new Error("Paramètres de chiffrement invalides.");
        }

        // 5. Génération des Clés
        keyGenerator = sealInstance.KeyGenerator(context);
        secretKey = keyGenerator.secretKey();
        publicKey = keyGenerator.createPublicKey();
        
        // 6. Instanciation des helpers
        ckksEncoder = sealInstance.CKKSEncoder(context);
        encryptor = sealInstance.Encryptor(context, publicKey);
        decryptor = sealInstance.Decryptor(context, secretKey);

        console.log(`🔒 SEAL Initialisé. Slots disponibles par vecteur : ${ckksEncoder.slotCount}`);
        return true;
    } catch (e) {
        console.error("ERREUR FATALE SEAL:", e);
        return false;
    }
}

/**
 * Chiffre un tableau de nombres en UN SEUL Ciphertext (Batching).
 * Idéal pour le Big Data : 1 appel = 4096 valeurs chiffrées.
 */
export function encryptBatch(chunkArray) {
    if (!sealInstance || !encryptor) throw new Error("SEAL non initialisé");

    // Convertir en Float64Array (Requis par SEAL JS)
    const array = Float64Array.from(chunkArray);

    // Création des objets via l'instance stockée
    const plain = sealInstance.Plaintext();
    const cipher = sealInstance.Ciphertext();
    
    // Echelle 2^40
    const scale = Math.pow(2, 40);

    // Encode le vecteur entier dans le plaintext
    ckksEncoder.encode(array, scale, plain);
    
    // Chiffre le plaintext
    encryptor.encrypt(plain, cipher);

    // Retourne la chaîne Base64 pour envoi Azure
    return cipher.save();
}

export function decryptBatch(cipherBase64) {
    if (!sealInstance || !decryptor) throw new Error("SEAL non initialisé");

    const cipher = sealInstance.Ciphertext();
    cipher.load(context, cipherBase64);

    const plain = sealInstance.Plaintext();
    decryptor.decrypt(cipher, plain);

    // Décodage vectoriel
    return ckksEncoder.decode(plain); 
}

// Helper pour savoir combien de nombres on peut mettre dans un seul ciphertext
export function getSlotCount() {
    return ckksEncoder ? ckksEncoder.slotCount : 4096;
}
