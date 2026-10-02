#!/usr/bin/env node
/**
 * patch-bakong-khqr.js
 * 
 * Automatically patches the bakong-khqr library to fix strict-mode issues
 * that cause ReferenceErrors in Vite/ESM bundlers.
 * 
 * This runs as a postinstall script so the patches are applied both locally
 * and on Cloudflare Pages builds.
 */

const fs = require('fs');
const path = require('path');

const BAKONG_DIR = path.join(__dirname, 'node_modules', 'bakong-khqr', 'src');

const patches = [
  {
    file: path.join(BAKONG_DIR, 'helper', 'crc16.js'),
    search: /^(\s*)c = /m,
    replace: '$1let c = ',
    description: 'Declare "c" variable in crc16.js'
  },
  {
    file: path.join(BAKONG_DIR, 'controller', 'generateKHQR.js'),
    search: /(\s+)khqr = khqrNoCrc/,
    replace: '$1let khqr = khqrNoCrc',
    description: 'Declare "khqr" variable in generateKHQR.js'
  },
  {
    file: path.join(BAKONG_DIR, 'controller', 'decodeKHQR.js'),
    search: /^(\s*)sliceTagObject = /m,
    replace: '$1let sliceTagObject = ',
    description: 'Declare "sliceTagObject" in decodeKHQR.js'
  },
  {
    file: path.join(BAKONG_DIR, 'controller', 'decodeKHQR.js'),
    search: /^(\s*)cutsubstring = /m,
    replace: '$1let cutsubstring = ',
    description: 'Declare "cutsubstring" in decodeKHQR.js'
  },
  {
    file: path.join(BAKONG_DIR, 'controller', 'decodeValidation.js'),
    search: /^(\s*)sliceTagObject = /m,
    replace: '$1let sliceTagObject = ',
    description: 'Declare "sliceTagObject" in decodeValidation.js'
  },
  {
    file: path.join(BAKONG_DIR, 'controller', 'decodeValidation.js'),
    search: /^(\s*)cutsubstring = /m,
    replace: '$1let cutsubstring = ',
    description: 'Declare "cutsubstring" in decodeValidation.js'
  }
];

// Patch to add 5-minute expiry timestamp
const timestampPatch = {
  file: path.join(BAKONG_DIR, 'MerchantCode', 'timeStamp.js'),
  description: 'Add 5-minute expiry timestamp (subtag 01)'
};

console.log('🔧 Patching bakong-khqr for strict-mode compatibility...\n');

let patchCount = 0;

for (const patch of patches) {
  try {
    if (!fs.existsSync(patch.file)) {
      console.log(`  ⏭  Skipped (file not found): ${patch.description}`);
      continue;
    }
    let content = fs.readFileSync(patch.file, 'utf8');
    if (patch.search.test(content) && !content.match(new RegExp('let ' + patch.search.source.replace(/.*\(\\s\+\)/, '').replace(/.*\(\\s\*\)/, '')))) {
      content = content.replace(patch.search, patch.replace);
      fs.writeFileSync(patch.file, content, 'utf8');
      console.log(`  ✅ ${patch.description}`);
      patchCount++;
    } else {
      console.log(`  ⏭  Already patched: ${patch.description}`);
    }
  } catch (e) {
    console.error(`  ❌ Failed: ${patch.description} - ${e.message}`);
  }
}

// Timestamp patch - replace the entire TimeStamp class
try {
  if (fs.existsSync(timestampPatch.file)) {
    const tsContent = fs.readFileSync(timestampPatch.file, 'utf8');
    if (!tsContent.includes('expiryTimeStamp')) {
      const newContent = `const TagLengthString = require("../tagLengthString");

class TimeStamp extends TagLengthString {
    constructor(tag) {
        const milisecondTimeStamp = Math.floor(Date.now());
        const timeStamp = new TimeStampMiliSecond("00", milisecondTimeStamp);
        
        // Add 5-minute expiration timestamp (subtag 01)
        const expiryTimeStamp = milisecondTimeStamp + 300000;
        const expiryTag = new TimeStampMiliSecond("01", expiryTimeStamp);
        
        const value = timeStamp.toString() + expiryTag.toString();

        super(tag, value);
    }
}

class TimeStampMiliSecond extends TagLengthString {
    constructor(tag, value) {
        super(tag, value)
    }
}

module.exports = TimeStamp;
`;
      fs.writeFileSync(timestampPatch.file, newContent, 'utf8');
      console.log(`  ✅ ${timestampPatch.description}`);
      patchCount++;
    } else {
      console.log(`  ⏭  Already patched: ${timestampPatch.description}`);
    }
  }
} catch (e) {
  console.error(`  ❌ Failed: ${timestampPatch.description} - ${e.message}`);
}

console.log(`\n🎉 Bakong KHQR patching complete! (${patchCount} patches applied)\n`);
