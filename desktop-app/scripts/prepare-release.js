'use strict';

const path = require('node:path');
const { readBundledReleaseNotes } = require('../release-notes');
const { version } = require('../package.json');

if (!readBundledReleaseNotes(path.join(__dirname, '../CHANGELOG.md'), version)?.body) {
  throw new Error(`Add a nonempty ## ${version} section to CHANGELOG.md before packaging this release`);
}
require('./write-runtime-manifest');
