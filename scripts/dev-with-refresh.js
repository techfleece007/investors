#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Watch for changes in the public/images directory
const imagesDir = path.join(__dirname, '..', 'public', 'images');

console.log('🚀 Starting development server with image refresh...');
console.log('📁 Watching images directory:', imagesDir);

// Start the Next.js development server
const devServer = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Watch for changes in the images directory
if (fs.existsSync(imagesDir)) {
  fs.watch(imagesDir, (eventType, filename) => {
    if (eventType === 'rename' && filename) {
      console.log(`📸 New image detected: ${filename}`);
      console.log('💡 Image should be visible immediately in the browser');
    }
  });
} else {
  console.log('⚠️  Images directory does not exist yet. It will be created when you upload your first image.');
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  devServer.kill('SIGINT');
  process.exit(0);
});

devServer.on('close', (code) => {
  console.log(`Development server exited with code ${code}`);
  process.exit(code);
});
