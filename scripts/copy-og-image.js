import fs from 'fs';
import path from 'path';

const source = "C:\\Users\\RSDP-1\\.gemini\\antigravity-ide\\brain\\1023d870-0e54-4260-a36c-254773c5a638\\rangao_og_default_1781079138683.png";
const destDir = "f:\\rangao.bd_final\\public\\brand";
const dest = path.join(destDir, "rangao-og-default.png");

try {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log("Created directory:", destDir);
  }
  fs.copyFileSync(source, dest);
  console.log("Successfully copied OG image from:", source, "to:", dest);
} catch (err) {
  console.error("Error copying OG image:", err.message);
}
