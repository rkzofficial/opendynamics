#!/usr/bin/env node
/**
 * PWA Icon Generator Script
 * 
 * This script generates PWA icons from a source image.
 * Requires sharp: npm install -g sharp
 * 
 * Usage:
 *   node scripts/generate-pwa-icons.js <source-image>
 * 
 * Example:
 *   node scripts/generate-pwa-icons.js ./assets/logo.png
 */

import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const OUTPUT_DIR = join(__dirname, '..', 'public')

async function generateIcons(sourcePath) {
  try {
    // Dynamically import sharp (optional dependency)
    let sharp
    try {
      sharp = (await import('sharp')).default
    } catch {
      console.error('❌ sharp is required. Install with: bun add -d sharp')
      process.exit(1)
    }

    // Check if source exists
    await fs.access(sourcePath)

    console.log(`🎨 Generating PWA icons from: ${sourcePath}`)
    console.log(`📁 Output directory: ${OUTPUT_DIR}`)

    // Generate each icon size
    for (const size of ICON_SIZES) {
      const outputPath = join(OUTPUT_DIR, `icon-${size}x${size}.png`)
      
      await sharp(sourcePath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 15, g: 23, b: 42, alpha: 1 }, // slate-900 background
        })
        .png()
        .toFile(outputPath)
      
      console.log(`✅ Generated: icon-${size}x${size}.png`)
    }

    // Also generate favicon
    const faviconPath = join(OUTPUT_DIR, 'favicon.ico')
    await sharp(sourcePath)
      .resize(32, 32)
      .toFile(faviconPath)
    console.log(`✅ Generated: favicon.ico`)

    // Generate apple-touch-icon
    const appleIconPath = join(OUTPUT_DIR, 'apple-touch-icon.png')
    await sharp(sourcePath)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 15, g: 23, b: 42, alpha: 1 },
      })
      .png()
      .toFile(appleIconPath)
    console.log(`✅ Generated: apple-touch-icon.png`)

    console.log('\n🎉 All icons generated successfully!')
    console.log('\nNext steps:')
    console.log('  1. Add your icons to the public/ folder')
    console.log('  2. Run: bun run build')
    console.log('  3. Test PWA functionality in browser DevTools')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Get source path from command line
const sourcePath = process.argv[2]
if (!sourcePath) {
  console.error('Usage: node scripts/generate-pwa-icons.js <source-image>')
  process.exit(1)
}

generateIcons(sourcePath)
