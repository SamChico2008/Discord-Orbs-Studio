'use strict';

const { execFile, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const desktopDir = __dirname;
const workspaceDir = path.resolve(desktopDir, '..');
const projectDirs = [workspaceDir, desktopDir, path.join(workspaceDir, 'discord-quest-bot')];
const releaseApiUrl = 'https://api.github.com/repos/SamChico2008/Discord-Orbs-Studio/releases/latest';
const nodeVersionsUrl = 'https://nodejs.org/dist/index.json';
const electronLatestUrl = 'https://registry.npmjs.org/electron/latest';
const runtimeManifestName = 'runtime-manifest.json';
const updateTimeout = 7000;
const maxInstallerSize = 200 * 1024 * 1024;

function compareVersions(left, right) {
  const a = String(left).replace(/^v/, '').split('.').map(Number);
  const b = String(right).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const difference = (a[i] || 0) - (b[i] || 0);
    if (difference) return Math.sign(difference);
  }
  return 0;
}

function requestBuffer(url, { maxBytes = 1024 * 1024, redirects = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      reject(new Error('Update URLs must use HTTPS'));
      return;
    }

    const request = https.get(parsed, {
      headers: {
        'User-Agent': 'Discord-Orb-Studio',
        Accept: parsed.hostname === 'api.github.com' ? 'application/vnd.github+json' : 'application/json'
      }
    }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        const location = response.headers.location;
        response.resume();
        if (!location || redirects >= 5) {
          reject(new Error('Invalid or excessive update redirect'));
          return;
        }
        const destination = new URL(location, parsed);
        if (destination.protocol !== 'https:' || !['github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com'].includes(destination.hostname)) {
          reject(new Error('Unexpected update download host'));
          return;
        }
        requestBuffer(destination.href, { maxBytes, redirects: redirects + 1 }).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Update service returned HTTP ${response.statusCode}`));
        return;
      }

      const contentLength = Number(response.headers['content-length'] || 0);
      if (contentLength > maxBytes) {
        response.destroy(new Error('Update download exceeds the size limit'));
        return;
      }
      const chunks = [];
      let received = 0;
      response.on('data', (chunk) => {
        received += chunk.length;
        if (received > maxBytes) {
          response.destroy(new Error('Update download exceeds the size limit'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks, received)));
      response.on('error', reject);
    });
    request.setTimeout(updateTimeout, () => request.destroy(new Error('Update request timed out')));
    request.on('error', reject);
  });
}

function downloadAssetToFile(url, destination, { expectedDigest, expectedSize, maxBytes, redirects = 0 }) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      reject(new Error('Update URLs must use HTTPS'));
      return;
    }

    const request = https.get(parsed, {
      headers: { 'User-Agent': 'Discord-Orb-Studio', Accept: 'application/octet-stream' }
    }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        const location = response.headers.location;
        response.resume();
        if (!location || redirects >= 5) {
          reject(new Error('Invalid or excessive update redirect'));
          return;
        }
        const target = new URL(location, parsed);
        if (target.protocol !== 'https:' || !['github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com'].includes(target.hostname)) {
          reject(new Error('Unexpected update download host'));
          return;
        }
        downloadAssetToFile(target.href, destination, { expectedDigest, expectedSize, maxBytes, redirects: redirects + 1 }).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Update download returned HTTP ${response.statusCode}`));
        return;
      }

      const contentLength = Number(response.headers['content-length'] || 0);
      if (contentLength > maxBytes) {
        response.destroy(new Error('Update download exceeds the size limit'));
        return;
      }
      const hash = crypto.createHash('sha256');
      let received = 0;
      const verifier = new Transform({
        transform(chunk, encoding, callback) {
          received += chunk.length;
          if (received > maxBytes) {
            callback(new Error('Update download exceeds the size limit'));
            return;
          }
          hash.update(chunk);
          callback(null, chunk);
        }
      });

      pipeline(response, verifier, fs.createWriteStream(destination, { flags: 'wx', mode: 0o700 })).then(async () => {
        const digest = `sha256:${hash.digest('hex')}`;
        if ((expectedSize && received !== expectedSize) || (expectedDigest && digest !== expectedDigest.toLowerCase())) {
          await fs.promises.rm(destination, { force: true });
          reject(new Error('Installer checksum or size verification failed'));
          return;
        }
        resolve({ digest, size: received });
      }, async (error) => {
        await fs.promises.rm(destination, { force: true });
        reject(error);
      });
    });
    request.setTimeout(updateTimeout, () => request.destroy(new Error('Update download timed out')));
    request.on('error', reject);
  });
}

async function getJson(url) {
  const body = await requestBuffer(url);
  try {
    return JSON.parse(body.toString('utf8'));
  } catch (error) {
    throw new Error(`Invalid JSON from update service: ${error.message}`);
  }
}

async function getNodeLatestLts(fetchJson = getJson) {
  const releases = await fetchJson(nodeVersionsUrl);
  const latestLts = releases.find((release) => release.lts && !release.version.includes('-'));
  return latestLts ? latestLts.version.replace(/^v/, '') : null;
}

function isValidVersion(version) {
  return typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version);
}

function isOfficialReleaseAssetUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'github.com'
      && url.pathname.startsWith('/SamChico2008/Discord-Orbs-Studio/releases/download/');
  } catch {
    return false;
  }
}

function isCompatibleManifest(manifest, currentVersion, currentRuntime, latestRuntime) {
  if (!manifest || manifest.appVersion !== currentVersion || manifest.platform !== 'win32' || manifest.arch !== 'x64'
    || !isValidVersion(manifest.electron) || !isValidVersion(manifest.node)) return false;
  const electronAdvanced = compareVersions(manifest.electron, currentRuntime.electron) > 0;
  const nodeAdvanced = compareVersions(manifest.node, currentRuntime.node) > 0;
  return compareVersions(manifest.electron, currentRuntime.electron) >= 0
    && compareVersions(manifest.node, currentRuntime.node) >= 0
    && (electronAdvanced || nodeAdvanced)
    && (!electronAdvanced || compareVersions(manifest.electron, latestRuntime.electron) >= 0)
    && (!nodeAdvanced || compareVersions(manifest.node, latestRuntime.node) >= 0);
}

async function checkForPackagedRuntimeUpdates({
  appVersion,
  runtime,
  fetchJson = getJson,
  fetchAsset = (asset) => requestBuffer(asset.browser_download_url, { maxBytes: 1024 * 1024 }),
  platform = process.platform
}) {
  if (platform !== 'win32') return { updates: [], unsupported: true };

  const [latestNode, latestElectron] = await Promise.all([
    getNodeLatestLts(fetchJson),
    fetchJson(electronLatestUrl).then((release) => release.version)
  ]);
  if (!latestNode || !isValidVersion(latestNode) || !isValidVersion(latestElectron)) {
    throw new Error('Could not determine the latest stable Node.js and Electron versions');
  }

  const runtimeUpdates = [];
  if (compareVersions(runtime.node, latestNode) < 0) {
    runtimeUpdates.push({ name: 'Node.js', current: runtime.node, latest: latestNode });
  }
  if (compareVersions(runtime.electron, latestElectron) < 0) {
    runtimeUpdates.push({ name: 'Electron', current: runtime.electron, latest: latestElectron });
  }
  if (!runtimeUpdates.length) return { updates: [], unsupported: false };

  const release = await fetchJson(releaseApiUrl);
  if (release.draft || release.prerelease || !/^v\d+\.\d+\.\d+$/.test(release.tag_name || '')
    || compareVersions(release.tag_name, appVersion) <= 0) {
    return { updates: [], pendingUpdate: true, unsupported: false };
  }

  const manifestAsset = (release.assets || []).find((asset) => asset.name === runtimeManifestName);
  const installerAsset = (release.assets || []).find((asset) => asset.name === `Discord.Orb.Studio.Setup.${release.tag_name.slice(1)}.exe`);
  if (!manifestAsset || !isOfficialReleaseAssetUrl(manifestAsset.browser_download_url) || !/^sha256:[0-9a-f]{64}$/i.test(manifestAsset.digest || '')
    || !installerAsset || !/^sha256:[0-9a-f]{64}$/i.test(installerAsset.digest || '')
    || !isOfficialReleaseAssetUrl(installerAsset.browser_download_url)
    || !Number.isSafeInteger(installerAsset.size) || installerAsset.size <= 0 || installerAsset.size > maxInstallerSize) {
    return { updates: [], pendingUpdate: true, unsupported: false };
  }

  const manifestBytes = await fetchAsset(manifestAsset);
  const manifestHash = crypto.createHash('sha256').update(manifestBytes).digest('hex');
  if (`sha256:${manifestHash}` !== manifestAsset.digest.toLowerCase()) throw new Error('Runtime manifest checksum verification failed');
  let manifest;
  try { manifest = JSON.parse(manifestBytes.toString('utf8')); } catch { throw new Error('Invalid runtime manifest in latest release'); }

  const latestRuntime = { node: latestNode, electron: latestElectron };
  if (!isCompatibleManifest(manifest, release.tag_name.slice(1), runtime, latestRuntime)) {
    return { updates: [], pendingUpdate: true, unsupported: false };
  }

  const compatibleUpdates = [];
  if (compareVersions(manifest.node, runtime.node) > 0) {
    compatibleUpdates.push({ name: 'Node.js', current: runtime.node, latest: manifest.node, kind: 'runtime' });
  }
  if (compareVersions(manifest.electron, runtime.electron) > 0) {
    compatibleUpdates.push({ name: 'Electron', current: runtime.electron, latest: manifest.electron, kind: 'runtime' });
  }

  return {
    updates: compatibleUpdates.map((update) => ({ ...update, release: {
      tag: release.tag_name,
      installerUrl: installerAsset.browser_download_url,
      installerDigest: installerAsset.digest,
      installerSize: installerAsset.size
    } })),
    autoInstall: true,
    unsupported: false
  };
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

async function getNodeDevelopmentUpdate() {
  if (process.platform !== 'win32') return null;
  const [installedOutput, releases] = await Promise.all([
    run('node', ['--version'], workspaceDir),
    getJson(nodeVersionsUrl)
  ]);
  const current = installedOutput.replace(/^v/, '');
  const latestLts = releases.find((release) => release.lts && !release.version.includes('-'));
  if (!latestLts) return null;
  const latest = latestLts.version.replace(/^v/, '');
  if (compareVersions(current, latest) >= 0) return null;
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
  if (packaged) {
    try {
      return await checkForPackagedRuntimeUpdates({
        appVersion: require('./package.json').version,
        runtime: { electron: process.versions.electron, node: process.versions.node }
      });
    } catch (error) {
      return { updates: [], errors: [error.message], unsupported: false };
    }
  }

  const checks = [getNodeDevelopmentUpdate(), getNpmPackageUpdate('electron', desktopDir, 'devDependencies')];
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

function powershellLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildInstallerHandoffCommand(installerPath, installDir, executableName) {
  const appPath = path.join(installDir, executableName);
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `\u0024installer = ${powershellLiteral(installerPath)}`,
    `\u0024installDir = ${powershellLiteral(installDir)}`,
    `\u0024appPath = ${powershellLiteral(appPath)}`,
    'try {',
    '  $arguments = @(\'/S\', (\'"/D=\' + $installDir + \'"\'))',
    '  $result = Start-Process -FilePath $installer -ArgumentList $arguments -WindowStyle Hidden -Wait -PassThru',
    '  if ($result.ExitCode -ne 0) { throw "Installer exited with code $($result.ExitCode)" }',
    '} finally {',
    '  if (Test-Path -LiteralPath $appPath) { Start-Process -FilePath $appPath -ArgumentList \'--updated\' -WorkingDirectory $installDir }',
    `  Remove-Item -LiteralPath ${powershellLiteral(installerPath)} -Force -ErrorAction SilentlyContinue`,
    '}'
  ].join('\n');
  return Buffer.from(script, 'utf16le').toString('base64');
}

async function installPackagedRuntimeUpdate(release, { tempDir, installDir, spawnProcess = spawn, download = null, executableName = path.basename(process.execPath) }) {
  if (process.platform !== 'win32') throw new Error('Automatic runtime updates are currently supported on Windows only');
  if (!/^v\d+\.\d+\.\d+$/.test(release.tag || '') || !/^sha256:[0-9a-f]{64}$/i.test(release.installerDigest || '')
    || !release.installerUrl || !path.isAbsolute(tempDir) || !path.isAbsolute(installDir)) {
    throw new Error('Invalid runtime update installer metadata');
  }

  const installerPath = path.join(tempDir, `Discord-Orb-Studio-${release.tag}-${crypto.randomUUID()}-setup.exe`);
  if (download) {
    const installer = await download(release.installerUrl, { maxBytes: maxInstallerSize });
    if (!Buffer.isBuffer(installer)) throw new Error('Test installer download must return a buffer');
    if (release.installerSize && installer.length !== release.installerSize) throw new Error('Installer size verification failed');
    const actualDigest = crypto.createHash('sha256').update(installer).digest('hex');
    if (`sha256:${actualDigest}` !== release.installerDigest.toLowerCase()) throw new Error('Installer checksum verification failed');
    await fs.promises.writeFile(installerPath, installer, { flag: 'wx', mode: 0o700 });
  } else {
    await downloadAssetToFile(release.installerUrl, installerPath, {
      expectedDigest: release.installerDigest,
      expectedSize: release.installerSize,
      maxBytes: maxInstallerSize
    });
  }
  const handoffCommand = buildInstallerHandoffCommand(installerPath, installDir, executableName);
  try {
    const child = spawnProcess('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', handoffCommand], {
      detached: true,
      windowsHide: true,
      stdio: 'ignore'
    });
    await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('spawn', resolve);
    });
    child.unref();
  } catch (error) {
    await fs.promises.rm(installerPath, { force: true });
    throw error;
  }
  return installerPath;
}

async function applyUpdates(updates, options = {}) {
  for (const update of updates) {
    if (update.kind === 'runtime') {
      await installPackagedRuntimeUpdate(update.release, options);
      return;
    }
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

module.exports = {
  checkForUpdates,
  checkForPackagedRuntimeUpdates,
  applyUpdates,
  installPackagedRuntimeUpdate,
  buildInstallerHandoffCommand,
  isCompatibleManifest,
  compareVersions
};
