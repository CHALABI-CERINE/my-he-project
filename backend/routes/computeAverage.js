const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { loadCiphertext, computeEncryptedSum, computeEncryptedAverage } = require('../he_utils');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

router.post('/', async (req, res) => {
  try {
    // 1. Read all files from uploads directory
    const files = fs.readdirSync(UPLOAD_DIR).filter(f => f.endsWith('.json'));
    
    if (files.length === 0) {
      return res.status(400).json({ error: 'No chunks found. Please upload data first.' });
    }

    console.log(`Loading ${files.length} chunks for computation...`);

    // 2. Load and parse the JSON files
    const cipherObjects = files.map(filename => {
      const filePath = path.join(UPLOAD_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      const json = JSON.parse(content);
      return loadCiphertext(json.ciphertext);
    });

    // 3. Compute Sum
    console.log('Computing Sum...');
    const sumCipher = computeEncryptedSum(cipherObjects);

    // 4. Compute Average
    console.log('Computing Average...');
    // We use the count provided by the client, or default to 1 to avoid division by zero
    const totalItems = req.body.totalItems || 1;
    const avgCipher = computeEncryptedAverage(sumCipher, totalItems);

    // 5. Save result to Base64
    const resultBase64 = avgCipher.save();
    
    // Cleanup C++ objects
    cipherObjects.forEach(c => c.delete());
    sumCipher.delete();
    avgCipher.delete();

    console.log('✅ Computation complete.');
    res.json({ resultCiphertext: resultBase64 });

  } catch (err) {
    console.error("Computation error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;