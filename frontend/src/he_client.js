import SEAL from 'node-seal';

// Variables globales au module
let seal = null;
let context = null;
let encryptor = null;
let decryptor = null;
let ckksEncoder = null;
// let keyGenerator = null; // Pas strictement nécessaire en global si non réutilisé
// let evaluator = null;    // Pas nécessaire côté client pour juste chiffrer

export async function initSEALAndKeys(polyModulusDegree = 8192, scaleBits = 40) {
    try {
        console.log("Initialisation de SEAL...");
        const _seal = await SEAL();
        
        // Vérification critique : l'objet SEAL est-il valide ?
        if (!_seal) {
            throw new Error("L'initialisation de WebAssembly SEAL a échoué (objet null).");
        }
        seal = _seal;

        const schemeType = seal.SchemeType.ckks;
        const securityLevel = seal.SecurityLevel.tc128;
        
        const parms = seal.EncryptionParameters(schemeType);
        parms.setPolyModulusDegree(polyModulusDegree);
        
        const bitSizes = [60, scaleBits, scaleBits, 60];
        parms.setCoeffModulus(seal.CoeffModulus.Create(polyModulusDegree, Int32Array.from(bitSizes)));

        context = seal.Context(parms, true, securityLevel);

        if (!context.parametersSet()) {
            throw new Error("Paramètres de cryptage invalides.");
        }

        const keyGenerator = seal.KeyGenerator(context);
        const publicKey = keyGenerator.createPublicKey();
        const secretKey = keyGenerator.secretKey(); // Gardé en mémoire pour le déchiffrement

        ckksEncoder = seal.CKKSEncoder(context);
        encryptor = seal.Encryptor(context, publicKey);
        decryptor = seal.Decryptor(context, secretKey);

        console.log("🔒 SEAL Client Initialisé avec succès. API disponible:", Object.keys(seal).join(", "));
        return true;
    } catch (e) {
        console.error("Erreur critique init SEAL:", e);
        return false;
    }
}

export function encryptData(valueOrArray, scaleBits = 40) {
    // 1. Vérification de l'état
    if (!seal) throw new Error("SEAL non chargé. Avez-vous attendu l'initialisation ?");
    if (!encryptor || !ckksEncoder) throw new Error("Encodeur/Chiffreur non prêts.");

    try {
        const inputArray = Array.isArray(valueOrArray) ? valueOrArray : [valueOrArray];
        const floatArray = Float64Array.from(inputArray);
        const scale = Math.pow(2, scaleBits);

        // 2. Instanciation Robuste du Plaintext
        let plain;
        // Vérifie si Plaintext est une fonction (Factory pattern standard)
        if (typeof seal.Plaintext === 'function') {
            try {
                plain = seal.Plaintext();
            } catch (err) {
                // Si l'appel direct échoue (ex: besoin de 'new'), on tente 'new'
                console.warn("Appel factory Plaintext échoué, tentative avec new...", err);
                plain = new seal.Plaintext();
            }
        } else {
            // Si ce n'est pas une fonction, c'est peut-être un constructeur ou undefined
            console.error("seal.Plaintext n'est pas une fonction standard. Type:", typeof seal.Plaintext);
            throw new Error(`Impossible de créer un Plaintext. seal.Plaintext est ${typeof seal.Plaintext}`);
        }

        // 3. Encodage
        ckksEncoder.encode(floatArray, scale, plain);

        // 4. Chiffrement (Même logique robuste pour Ciphertext)
        let cipher;
        if (typeof seal.Ciphertext === 'function') {
            try {
                cipher = seal.Ciphertext();
            } catch {
                cipher = new seal.Ciphertext();
            }
        } else {
             cipher = new seal.Ciphertext(); // Tentative désespérée
        }

        encryptor.encrypt(plain, cipher);

        return cipher.save(); // Retourne Base64

    } catch (e) {
        console.error("Erreur dans encryptData:", e);
        // On affiche les clés de seal pour aider au debug si ça plante encore
        if(seal) console.log("Debug SEAL keys:", Object.keys(seal));
        throw e;
    }
}

export function decryptResult(cipherBase64) {
    if (!seal || !decryptor) throw new Error("SEAL non initialisé");

    try {
        // Instanciation robuste
        let cipher;
        if(typeof seal.Ciphertext === 'function') cipher = seal.Ciphertext();
        else cipher = new seal.Ciphertext();
        
        cipher.load(context, cipherBase64);

        let plain;
        if(typeof seal.Plaintext === 'function') plain = seal.Plaintext();
        else plain = new seal.Plaintext();

        decryptor.decrypt(cipher, plain);

        return ckksEncoder.decode(plain);
    } catch (e) {
        console.error("Erreur decryptData:", e);
        throw e;
    }
}
