# Automatic runtime updates

The Windows setup bundles Electron and Electron's embedded Node.js. The installed application cannot upgrade either runtime independently, so startup updates install a complete, newer Windows setup and NSIS launches the updated app when installation finishes.

Before publishing each Windows release:

1. Build the setup with `npm --prefix desktop-app run build`.
2. Generate the exact embedded runtime manifest with `npm --prefix desktop-app run runtime-manifest`.
3. Upload both `dist/Discord.Orb.Studio.Setup.<version>.exe` and `dist/runtime-manifest.json` to the same stable GitHub release tagged `v<version>`.

At startup, the installed app compares its embedded Node.js and Electron versions against Node.js LTS and the stable Electron npm release. If either runtime is behind, it installs only a newer stable GitHub release whose checksummed manifest updates that runtime to its latest stable version without downgrading the other runtime. It verifies the manifest and installer SHA-256, launches the installer silently, and restarts the updated app after setup finishes. Electron's embedded Node.js cannot be upgraded as a standalone package: a compatible Electron build must include the newer Node.js. If a compatible setup has not been published yet, the current app opens normally and checks again on the next launch. Updating from an older edition that does not contain this updater requires installing the updater-enabled edition once.
