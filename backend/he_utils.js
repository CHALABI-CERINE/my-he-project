const SEAL = require('node-seal');

let seal = null;
let context = null;
let ckksEncoder = null;
let evaluator = null;

async function initSEAL() {
  if (seal) return seal;
  try {
    const factory = SEAL.default || SEAL;
    seal = await factory();

    const schemeType = seal.SchemeType.ckks;
    const securityLevel = seal.SecurityLevel.tc128;
    const polyModulusDegree = 8192;
    const bitSizes = [60, 40, 40, 60];

    const parms = seal.EncryptionParameters(schemeType);
    parms.setPolyModulusDegree(polyModulusDegree);
    parms.setCoeffModulus(seal.CoeffModulus.Create(polyModulusDegree, Int32Array.from(bitSizes)));

    context = seal.Context(parms, true, securityLevel);
    
    if (!context.parametersSet()) {
      throw new Error('SEAL parameters are invalid.');
    }

    ckksEncoder = seal.CKKSEncoder(context);
    evaluator = seal.Evaluator(context);

    console.log('🔒 SEAL (v4.1.4) Backend Initialized Successfully!');
    return seal;
  } catch (err) {
    console.error('Error initializing SEAL:', err);
    throw err;
  }
}

// Helper: Load Base64 string into a SEAL Ciphertext object
function loadCiphertext(base64Str) {
  const cipher = seal.Ciphertext();
  cipher.load(context, base64Str);
  return cipher;
}

// Helper: Sum an array of ciphertexts
function computeEncryptedSum(ciphertexts) {
  if (ciphertexts.length === 0) return null;
  const result = ciphertexts[0]; 
  for (let i = 1; i < ciphertexts.length; i++) {
    evaluator.add(result, ciphertexts[i], result);
  }
  return result;
}

// Helper: Multiply sum by 1/N
function computeEncryptedAverage(sumCiphertext, count) {
  const scale = Math.pow(2, 40);
  const plainInvCount = seal.Plaintext();
  ckksEncoder.encode(1.0 / count, scale, plainInvCount);

  const avgCiphertext = seal.Ciphertext();
  evaluator.multiplyPlain(sumCiphertext, plainInvCount, avgCiphertext);
  return avgCiphertext;
}

module.exports = {
  initSEAL,
  loadCiphertext,
  computeEncryptedSum,
  computeEncryptedAverage,
  getContext: () => context
};