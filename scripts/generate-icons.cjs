/**
 * Generate all favicon and icon sizes from icon-512.png
 * Run: node scripts/generate-icons.cjs
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = path.join(__dirname, '..', 'client', 'public', 'icons', 'icon-512.png');
const PUBLIC = path.join(__dirname, '..', 'client', 'public');
const ICONS_DIR = path.join(PUBLIC, 'icons');
const ANDROID_RES = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

async function main() {
  console.log('Source icon:', SOURCE);
  if (!fs.existsSync(SOURCE)) {
    console.error('ERROR: icon-512.png not found!');
    process.exit(1);
  }

  // 1. Web favicons
  console.log('\n--- Web Favicons ---');
  
  // favicon-16x16.png
  await sharp(SOURCE).resize(16, 16).png().toFile(path.join(ICONS_DIR, 'favicon-16x16.png'));
  console.log('  Created: favicon-16x16.png');

  // favicon-32x32.png  
  await sharp(SOURCE).resize(32, 32).png().toFile(path.join(ICONS_DIR, 'favicon-32x32.png'));
  console.log('  Created: favicon-32x32.png');
  
  // favicon-48x48.png (for ICO)
  await sharp(SOURCE).resize(48, 48).png().toFile(path.join(ICONS_DIR, 'favicon-48x48.png'));
  console.log('  Created: favicon-48x48.png');

  // apple-touch-icon.png (180x180) at root
  await sharp(SOURCE).resize(180, 180).png().toFile(path.join(PUBLIC, 'apple-touch-icon.png'));
  console.log('  Created: apple-touch-icon.png (root)');

  // favicon.ico (multi-size ICO using 48x48 PNG as base)
  // We'll create a proper .ico file with 16, 32, 48 px
  const ico16 = await sharp(SOURCE).resize(16, 16).png().toBuffer();
  const ico32 = await sharp(SOURCE).resize(32, 32).png().toBuffer();
  const ico48 = await sharp(SOURCE).resize(48, 48).png().toBuffer();
  
  // Build ICO file manually (ICO format header + PNG entries)
  const icoBuffer = buildIco([ico16, ico32, ico48], [16, 32, 48]);
  fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), icoBuffer);
  console.log('  Created: favicon.ico (16+32+48)');

  // Additional web sizes
  const webSizes = [36, 48, 57, 60, 64, 76, 114, 120, 144, 152, 167, 180, 192, 256, 384];
  for (const size of webSizes) {
    const file = path.join(ICONS_DIR, `icon-${size}.png`);
    await sharp(SOURCE).resize(size, size).png().toFile(file);
    console.log(`  Created: icon-${size}.png`);
  }
  // icon-512 already exists as source, just ensure quality
  console.log('  Skipped: icon-512.png (source file)');

  // Maskable icons (with padding for safe zone - 80% of canvas)
  console.log('\n--- Maskable Icons ---');
  for (const size of [192, 512]) {
    const padding = Math.round(size * 0.1); // 10% padding each side
    const innerSize = size - (padding * 2);
    const maskable = await sharp(SOURCE)
      .resize(innerSize, innerSize)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 107, g: 77, b: 157, alpha: 1 } // #6B4D9D
      })
      .png()
      .toFile(path.join(ICONS_DIR, `icon-maskable-${size}.png`));
    console.log(`  Created: icon-maskable-${size}.png`);
  }

  // 2. Android icons
  console.log('\n--- Android Icons ---');
  const androidSizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
  };

  for (const [dir, size] of Object.entries(androidSizes)) {
    const dirPath = path.join(ANDROID_RES, dir);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    // ic_launcher.png (full icon with background)
    await sharp(SOURCE).resize(size, size).png().toFile(path.join(dirPath, 'ic_launcher.png'));
    console.log(`  ${dir}/ic_launcher.png (${size}x${size})`);

    // ic_launcher_round.png (same as launcher)
    await sharp(SOURCE).resize(size, size).png().toFile(path.join(dirPath, 'ic_launcher_round.png'));
    console.log(`  ${dir}/ic_launcher_round.png (${size}x${size})`);

    // ic_launcher_foreground.png (for adaptive icons - needs to be 108/72 = 1.5x the size)
    // Adaptive icon foreground should be 108dp canvas → actual pixels = size * 1.5 roughly
    // But the mipmap expects the same dp-based size, so we resize to match
    const fgSize = Math.round(size * 1.5);  // Foreground is larger for the adaptive crop
    const fgPadding = Math.round((fgSize - size) / 2);
    
    // Create foreground: logo centered on transparent background, 1.5x canvas
    await sharp(SOURCE)
      .resize(size, size)
      .extend({
        top: fgPadding,
        bottom: fgPadding,
        left: fgPadding,
        right: fgPadding,
        background: { r: 0, g: 0, b: 0, alpha: 0 } // transparent
      })
      .png()
      .toFile(path.join(dirPath, 'ic_launcher_foreground.png'));
    console.log(`  ${dir}/ic_launcher_foreground.png (${fgSize}x${fgSize})`);
  }

  console.log('\n✅ All icons generated successfully!');
}

/**
 * Build a minimal ICO file from PNG buffers
 */
function buildIco(pngBuffers, sizes) {
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dataOffset = headerSize + (dirEntrySize * numImages);
  
  let totalSize = dataOffset;
  for (const buf of pngBuffers) totalSize += buf.length;
  
  const ico = Buffer.alloc(totalSize);
  
  // ICO header
  ico.writeUInt16LE(0, 0);      // Reserved
  ico.writeUInt16LE(1, 2);      // Type: ICO
  ico.writeUInt16LE(numImages, 4); // Number of images
  
  let currentOffset = dataOffset;
  
  for (let i = 0; i < numImages; i++) {
    const entryOffset = headerSize + (i * dirEntrySize);
    const size = sizes[i] > 255 ? 0 : sizes[i];
    
    ico.writeUInt8(size, entryOffset);         // Width
    ico.writeUInt8(size, entryOffset + 1);     // Height
    ico.writeUInt8(0, entryOffset + 2);        // Color palette
    ico.writeUInt8(0, entryOffset + 3);        // Reserved
    ico.writeUInt16LE(1, entryOffset + 4);     // Color planes
    ico.writeUInt16LE(32, entryOffset + 6);    // Bits per pixel
    ico.writeUInt32LE(pngBuffers[i].length, entryOffset + 8); // Size
    ico.writeUInt32LE(currentOffset, entryOffset + 12);       // Offset
    
    pngBuffers[i].copy(ico, currentOffset);
    currentOffset += pngBuffers[i].length;
  }
  
  return ico;
}

main().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
