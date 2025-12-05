const fs = require('fs');
const path = require('path');
const https = require('https');

// URLs for the exact version 4.1.4
const files = [
  { name: 'seal.js', url: 'https://unpkg.com/node-seal@4.1.4/dist/seal.js' },
  { name: 'seal.wasm', url: 'https://unpkg.com/node-seal@4.1.4/dist/seal.wasm' }
];

const targetDir = path.join(__dirname, 'frontend', 'public');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log(`📂 Target Directory: ${targetDir}`);

files.forEach(file => {
  const filePath = path.join(targetDir, file.name);
  const fileStream = fs.createWriteStream(filePath);

  console.log(`⬇️ Downloading ${file.name}...`);

  https.get(file.url, (response) => {
    if (response.statusCode !== 200) {
      console.error(`❌ Failed to download ${file.name} (Status: ${response.statusCode}). It might not exist for this version, which is fine if it's embedded.`);
      fileStream.close();
      fs.unlinkSync(filePath); // Delete empty file
      return;
    }

    response.pipe(fileStream);

    fileStream.on('finish', () => {
      fileStream.close();
      console.log(`✅ ${file.name} saved successfully!`);
    });
  }).on('error', (err) => {
    console.error(`Error downloading ${file.name}:`, err.message);
  });
});