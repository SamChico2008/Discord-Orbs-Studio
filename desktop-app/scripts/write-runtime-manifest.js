'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const electronExecutable = require('electron');
const packageInfo = require('../package.json');
const outputPath = path.resolve(__dirname, process.argv[2] || '../runtime-manifest.json');
const runtime = JSON.parse(execFileSync(electronExecutable, [
  '-e',
  'process.stdout.write(JSON.stringify({ node: process.versions.node, electron: process.versions.electron }))'
], {
  encoding: 'utf8',
  timeout: 15000,
  windowsHide: true,
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
}));

if (!/^\d+\.\d+\.\d+$/.test(runtime.node) || !/^\d+\.\d+\.\d+$/.test(runtime.electron)) {
  throw new Error('Electron did not return valid embedded runtime versions');
}

const manifest = {
  appVersion: packageInfo.version,
  electron: runtime.electron,
  node: runtime.node,
  platform: 'win32',
  arch: 'x64'
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`${outputPath}\n${JSON.stringify(manifest)}\n`);
