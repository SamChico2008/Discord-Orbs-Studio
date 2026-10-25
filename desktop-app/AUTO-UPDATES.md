# Startup Updates

When starting from source (`npm start`), a window displays "Checking for updates...". If a newer LTS version of Node.js or Electron is available, the application prompts before installing. Choosing "Later" keeps current versions unchanged. After installation, the application restarts.

Node.js is managed via `winget` on Windows. All checks are non-blocking in case of network unavailability.

Packaged NSIS/portable builds run independently. In packaged releases, the updater screen informs that automatic background feeds are not active and points to GitHub releases for new versions.
