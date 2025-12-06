import SEAL from 'node-seal';

let sealInstance = null;
let context = null;
let encryptor = null;
let decryptor = null;
let ckksEncoder = null;
let keyGenerator = null;
let secretKey = null;
let publicKey = null;

// Références dynamiques aux constructeurs (pour gérer PlainText vs Plaintext)
let PlainTextConstructor = null;
let CipherTextConstructor = null;

// Configuration Big Data (8192 permet 4096 valeurs par vecteur)
const POLY_MODULUS_DEGREE = 8192; 
const BIT_SIZES = [60, 40, 40, 60]; 

export async function initSEALAndKeys() {
    try {
        const _seal = await SEAL();
        sealInstance = _seal;

        // --- CORRECTION CRITIQUE : DÉTECTION DES MAJUSCULES ---
        PlainTextConstructor = sealInstance.PlainText || sealInstance.Plaintext;
        CipherTextConstructor = sealInstance.CipherText || sealInstance.Ciphertext;

        if (!PlainTextConstructor || !CipherTextConstructor) {
            throw new Error("Impossible de trouver les constructeurs PlainText/CipherText dans l'objet SEAL.");
        }
        // -------------------------------------------------------

        const schemeType = sealInstance.SchemeType.ckks;
        const securityLevel = sealInstance.SecurityLevel.tc128;
        const parms = sealInstance.EncryptionParameters(schemeType);
        
        parms.setPolyModulusDegree(POLY_MODULUS_DEGREE);
        parms.setCoeffModulus(
            sealInstance.CoeffModulus.Create(POLY_MODULUS_DEGREE, Int32Array.from(BIT_SIZES))
        );

        context = sealInstance.Context(parms, true, securityLevel);
        
        if (!context.parametersSet()) {
            throw new Error("Paramètres de chiffrement invalides.");
        }

        keyGenerator = sealInstance.KeyGenerator(context);
        secretKey = keyGenerator.secretKey();
        publicKey = keyGenerator.createPublicKey();
        
        ckksEncoder = sealInstance.CKKSEncoder(context);
        encryptor = sealInstance.Encryptor(context, publicKey);
        decryptor = sealInstance.Decryptor(context, secretKey);

        console.log(`🔒 SEAL Initialisé. Batch Size: ${ckksEncoder.slotCount}`);
        return true;
    } catch (e) {
        console.error("ERREUR FATALE SEAL:", e);
        return false;
    }
}

/**
 * Chiffre un GROS paquet de nombres (jusqu'à 4096) en une seule fois.
 * INDISPENSABLE pour 1M de lignes.
 */
export function encryptBatch(chunkArray) {
    if (!sealInstance || !encryptor) throw new Error("SEAL non initialisé");

    const array = Float64Array.from(chunkArray);
    
    // Utilisation des constructeurs détectés dynamiquement
    const plain = PlainTextConstructor();
    const cipher = CipherTextConstructor();
    
    const scale = Math.pow(2, 40);

    // Encode tout le tableau d'un coup
    ckksEncoder.encode(array, scale, plain);
    encryptor.encrypt(plain, cipher);

    return cipher.save();
}

export function decryptResult(cipherBase64) {
    if (!sealInstance || !decryptor) throw new Error("SEAL non initialisé");

    const cipher = CipherTextConstructor();
    cipher.load(context, cipherBase64);

    const plain = PlainTextConstructor();
    decryptor.decrypt(cipher, plain);

    return ckksEncoder.decode(plain); 
}

export const getBatchSize = () => ckksEncoder ? ckksEncoder.slotCount : 4096;
