'use strict';

const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const desktopDir = __dirname;
const workspaceDir = path.resolve(desktopDir, '..');
const projectDirs = [workspaceDir, desktopDir, path.join(workspaceDir, 'discord-quest-bot')];

function compareVersions(left, right) {
  const a = String(left).replace(/^v/, '').split('.').map(Number);
  const b = String(right).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const difference = (a[i] || 0) - (b[i] || 0);
    if (difference) return Math.sign(difference);
  }
  return 0;
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'Discord-Orb-Studio' } }, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    request.setTimeout(7000, () => request.destroy(new Error('Delai de connexion depasse')));
    request.on('error', reject);
  });
}

function run(command, args, cwd, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const exec = (executable, commandArgs) => execFile(executable, commandArgs, {
      cwd,
      timeout,
      windowsHide: true,
      maxBuffer: 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) reject(new Error((stderr || error.message).trim()));
      else resolve((stdout || '').trim());
    });
    if (process.platform === 'win32' && command === 'npm') {
      execFile('where.exe', ['node'], { cwd, windowsHide: true }, (whereError, stdout) => {
        const nodePath = !whereError && stdout ? stdout.split(/\r?\n/)[0].trim() : '';
        const npmCli = nodePath && path.join(path.dirname(nodePath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
        if (!npmCli || !fs.existsSync(npmCli)) {
          reject(new Error('npm-cli.js introuvable a cote de Node.js'));
          return;
        }
        exec(nodePath, [npmCli, ...args]);
      });
      return;
    }
    exec(command, args);
  });
}

async function latestNpmVersion(packageName, cwd) {
  return run('npm', ['view', packageName, 'version'], cwd);
}

async function getNodeUpdate() {
  if (process.platform !== 'win32') return null;
  const [installedOutput, releases] = await Promise.all([
    run('node', ['--version'], workspaceDir),
    getJson('https://nodejs.org/dist/index.json')
  ]);
  const current = installedOutput.replace(/^v/, '');
  const latestLts = releases.find((release) => release.lts && !release.version.includes('-'));
  if (!latestLts) return null;
  const latest = latestLts.version.replace(/^v/, '');
  if (compareVersions(current, latest) >= 0) return null;
  // Only offer an automatic Node update when winget is available to install it.
  await run('where.exe', ['winget'], workspaceDir);
  return { kind: 'node', name: 'Node.js LTS', current, latest, cwd: workspaceDir };
}

async function getNpmPackageUpdate(packageName, cwd, section) {
  const manifestPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest.dependencies?.[packageName] && !manifest.devDependencies?.[packageName]) return null;
  const latest = await latestNpmVersion(packageName, cwd);
  let current = null;
  try { current = require(path.join(cwd, 'node_modules', packageName, 'package.json')).version; } catch { /* install when absent */ }
  if (current && compareVersions(current, latest) >= 0) return null;
  return { kind: 'npm', packageName, section, name: packageName === 'next' ? 'Next.js' : 'Electron', current, latest, cwd };
}

async function checkForUpdates({ packaged = false } = {}) {
  if (packaged) return { updates: [], unsupported: true };

  const checks = [getNodeUpdate(), getNpmPackageUpdate('electron', desktopDir, 'devDependencies')];
  for (const cwd of projectDirs) {
    const manifestPath = path.join(cwd, 'package.json');
    if (!fs.existsSync(manifestPath)) continue;
    let manifest;
    try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { continue; }
    const section = manifest.dependencies?.next ? 'dependencies' : manifest.devDependencies?.next ? 'devDependencies' : null;
    if (section) checks.push(getNpmPackageUpdate('next', cwd, section));
  }

  const results = await Promise.allSettled(checks);
  const updates = results.filter((result) => result.status === 'fulfilled' && result.value).map((result) => result.value);
  const errors = results.filter((result) => result.status === 'rejected').map((result) => result.reason.message);
  return { updates, errors, unsupported: false };
}

async function applyUpdates(updates) {
  for (const update of updates) {
    if (update.kind === 'node') {
      await run('winget', [
        'upgrade', '--id', 'OpenJS.NodeJS.LTS', '--exact', '--silent',
        '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity'
      ], update.cwd, 180000);
      continue;
    }
    const args = ['install', `${update.packageName}@latest`];
    if (update.section === 'devDependencies') args.push('--save-dev');
    await run('npm', args, update.cwd, 300000);
  }
}

module.exports = { checkForUpdates, applyUpdates };
