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

// Initialise SEAL et génère les clés
export async function initSEALAndKeys(polyModulusDegree = 8192, scaleBits = 40) {
    try {
        const _seal = await SEAL();
        seal = _seal;

        const schemeType = seal.SchemeType.ckks;
        const securityLevel = seal.SecurityLevel.tc128;
        
        const parms = seal.EncryptionParameters(schemeType);
        parms.setPolyModulusDegree(polyModulusDegree);
        
        // Configuration : [60, 40, 40, 60]
        const bitSizes = [60, scaleBits, scaleBits, 60];
        parms.setCoeffModulus(seal.CoeffModulus.Create(polyModulusDegree, Int32Array.from(bitSizes)));

        context = seal.Context(parms, true, securityLevel);

        if (!context.parametersSet()) {
            throw new Error("Paramètres de cryptage invalides/insécurisés.");
        }

        keyGenerator = seal.KeyGenerator(context);
        secretKey = keyGenerator.secretKey();
        publicKey = keyGenerator.createPublicKey();
        
        evaluator = seal.Evaluator(context);
        ckksEncoder = seal.CKKSEncoder(context);
        encryptor = seal.Encryptor(context, publicKey);
        decryptor = seal.Decryptor(context, secretKey);

        console.log("🔒 SEAL Client Initialisé avec succès.");
        return true;
    } catch (e) {
        console.error("Erreur init SEAL:", e);
        return false;
    }
}

// Chiffre un nombre (ou tableau) en Base64
export function encryptData(valueOrArray, scaleBits = 40) {
    if (!seal || !encryptor) throw new Error("SEAL non initialisé");

    // Si c'est un nombre unique, on le met dans un tableau
    const inputArray = Array.isArray(valueOrArray) ? valueOrArray : [valueOrArray];

    const plain = seal.Plaintext();
    const scale = Math.pow(2, scaleBits);
    
    ckksEncoder.encode(Float64Array.from(inputArray), scale, plain);

    const cipher = seal.Ciphertext();
    encryptor.encrypt(plain, cipher);

    return cipher.save(); // Retourne la string Base64
}

// Déchiffre une string Base64 et retourne le tableau de nombres
export function decryptResult(cipherBase64) {
    if (!seal || !decryptor) throw new Error("SEAL non initialisé");

    const cipher = seal.Ciphertext();
    cipher.load(context, cipherBase64);

    const plain = seal.Plaintext();
    decryptor.decrypt(cipher, plain);

    const decoded = ckksEncoder.decode(plain);
    return decoded; // Retourne un Float64Array
}