import SEAL from 'node-seal';

let sealInstance = null;
let context = null;
let encryptor = null;
let decryptor = null;
let ckksEncoder = null;
let keyGenerator = null;
let secretKey = null;
let publicKey = null;

// Dynamic Constructors
let PlainTextConstructor = null;
let CipherTextConstructor = null;

const POLY_MODULUS_DEGREE = 8192; 
// J'utilise BIT_SIZES ici, qui est la variable correctement déclarée
const BIT_SIZES = [60, 40, 40, 60]; 

export async function initSEALAndKeys() {
    try {
        const _seal = await SEAL();
        sealInstance = _seal;

        // --- FIX: Detect correct capitalization ---
        PlainTextConstructor = sealInstance.PlainText || sealInstance.Plaintext;
        CipherTextConstructor = sealInstance.CipherText || sealInstance.Ciphertext;

        if (!PlainTextConstructor || !CipherTextConstructor) {
            throw new Error("Cannot find PlainText/CipherText constructors in SEAL library.");
        }

        const schemeType = sealInstance.SchemeType.ckks;
        const securityLevel = sealInstance.SecurityLevel.tc128;
        const parms = sealInstance.EncryptionParameters(schemeType);
        
        parms.setPolyModulusDegree(POLY_MODULUS_DEGREE);
        parms.setCoeffModulus(
            // !!! Ligne Corrigée : Utilise BIT_SIZES !!!
            sealInstance.CoeffModulus.Create(POLY_MODULUS_DEGREE, Int32Array.from(BIT_SIZES))
        );

        context = sealInstance.Context(parms, true, securityLevel);
        
        if (!context.parametersSet()) {
            throw new Error("Invalid encryption parameters.");
        }

        keyGenerator = sealInstance.KeyGenerator(context);
        secretKey = keyGenerator.secretKey();
        publicKey = keyGenerator.createPublicKey();
        
        ckksEncoder = sealInstance.CKKSEncoder(context);
        encryptor = sealInstance.Encryptor(context, publicKey);
        decryptor = sealInstance.Decryptor(context, secretKey);

        console.log(`🔒 SEAL Initialized. Batch Size: ${ckksEncoder.slotCount}`);
        return true;
    } catch (e) {
        console.error("SEAL Init Error:", e);
        return false;
    }
}

export function encryptBatch(chunkArray) {
    if (!sealInstance || !encryptor) throw new Error("SEAL not initialized");

    const array = Float64Array.from(chunkArray);
    
    // Use the detected constructor
    const plain = PlainTextConstructor();
    const cipher = CipherTextConstructor();
    
    const scale = Math.pow(2, 40);

    ckksEncoder.encode(array, scale, plain);
    encryptor.encrypt(plain, cipher);

    return cipher.save();
}

export function decryptResult(cipherBase64) {
    if (!sealInstance || !decryptor) throw new Error("SEAL not initialized");

    // Use the detected constructor
    const cipher = CipherTextConstructor();
    cipher.load(context, cipherBase64);

    const plain = PlainTextConstructor();
    decryptor.decrypt(cipher, plain);

    return ckksEncoder.decode(plain); 
}

export const getBatchSize = () => ckksEncoder ? ckksEncoder.slotCount : 4096;
