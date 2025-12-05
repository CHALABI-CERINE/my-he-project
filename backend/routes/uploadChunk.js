const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Define where to save
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

router.post('/', (req, res) => {
  try {
    const { index, ciphertext } = req.body;
    
    if (index === undefined || !ciphertext) {
      return res.status(400).json({ error: 'Missing index or ciphertext' });
    }

    // We save as JSON to match your screenshot's "chunk-0.json"
    const filePath = path.join(UPLOAD_DIR, `chunk-${index}.json`);
    const fileData = JSON.stringify({ index, ciphertext });
    
    fs.writeFileSync(filePath, fileData);
    
    console.log(`✅ Received and saved chunk ${index}`);
    res.json({ status: 'ok', receivedIndex: index });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;