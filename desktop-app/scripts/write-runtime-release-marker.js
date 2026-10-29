'use strict';

const fs = require('node:fs');
const path = require('node:path');

const manifestPath = path.resolve(__dirname, '../runtime-manifest.json');
const manifest = fs.readFileSync(manifestPath);
JSON.parse(manifest.toString('utf8'));
process.stdout.write(`<!-- orb-runtime-manifest:${manifest.toString('base64')} -->\n`);
