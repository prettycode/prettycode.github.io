#!/usr/bin/env node

const { spawn } = require('child_process');
const { exec } = require('child_process');

// Spawn serve process
const serve = spawn('npx', ['serve'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

let urlOpened = false;

// Parse stdout to find the URL
serve.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output); // Pass through to console

  if (urlOpened) {
    return;
  }

  // Look for the local URL in serve's output
  const match = output.match(/https?:\/\/[^\s]+/);

  if (!match) {
    return;
  }

  const url = match[0];
  console.log(`\nOpening browser to ${url}...\n`);

  // Cross-platform browser opening
  const command = process.platform === 'win32' ? `start ${url}` :
                  process.platform === 'darwin' ? `open ${url}` :
                  `xdg-open ${url}`;

  exec(command);
  urlOpened = true;
});

serve.stderr.on('data', (data) => {
  process.stderr.write(data);
});

serve.on('close', (code) => {
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  serve.kill('SIGINT');
});
