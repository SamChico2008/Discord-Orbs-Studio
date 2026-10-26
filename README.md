# Discord Orb Studio

<div align="center">
  <img src="desktop-app/assets/icon.png" width="96" height="96" alt="Discord Orb Studio Logo" />
  <h3>Desktop Companion for Discord Quests & Rewards</h3>
  <p>A lightweight, modern desktop application designed to track, automate, and claim Discord quests and rewards without launching or installing heavy game clients.</p>

  <p>
    <a href="https://github.com/SamChico2008/Discord-Orbs-Studio/releases/latest"><img src="https://img.shields.io/badge/Platform-Windows_x64-0078D6?style=flat-square&logo=windows&logoColor=white" alt="Platform Windows" /></a>
    <a href="https://github.com/SamChico2008/Discord-Orbs-Studio/releases/tag/v3.3.7"><img src="https://img.shields.io/badge/Release-v3.3.7-5865F2?style=flat-square&logo=github&logoColor=white" alt="Release v3.3.7" /></a>
    <a href="https://www.electronjs.org/"><img src="https://img.shields.io/badge/Electron-v45.0.0-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron" /></a>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-%3E%3D24.0.0-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square" alt="License MIT" /></a>
    <a href="https://github.com/SamChico2008"><img src="https://img.shields.io/badge/Developer-Helios-blueviolet?style=flat-square" alt="Developer Helios" /></a>
  </p>
</div>

---

## Interface Preview

<div align="center">
  <img src="docs/screenshots/quests-dashboard.png" width="49%" alt="Discord Orb Studio quests dashboard" />
  <img src="docs/screenshots/live-monitor.png" width="49%" alt="Discord Orb Studio live session monitor" />
  <img src="docs/screenshots/account-management.png" width="49%" alt="Discord Orb Studio account management" />
  <img src="docs/screenshots/settings.png" width="49%" alt="Discord Orb Studio settings and profile display options" />
</div>

---

## Key Features

- **Background Quest Processing**: Complete gaming and video quests autonomously with heartbeat packet scheduling and activity session simulation.
- **Interactive Orbital Visualizer**: Real-time progress monitoring featuring rotating orbital rings and a synchronized live equalizer.
- **Dynamic Multi-Color Themes**: Personalize the workspace with four color schemes (*Periwinkle*, *Sage*, *Peach*, *Rose*) that dynamically adapt accent glows, button states, and progress indicators.
- **Refined Ergonomics**: Centered floating action button for saving preferences, on-demand client build info toggle, and smooth view transitions.
- **Multi-Account & Privacy Controls**: Multiple operational modes (*Turbo* or *Balanced*), fingerprint management, and secure multi-account switching with password or QR code login.
- **Streamlined Native Installer**: Windows 10 & 11 setup wizard with custom branding, English localization, and destination directory selection.

---

## Project Structure

```text
DISCORD ORB APP/
├── desktop-app/              # Main desktop application (Electron)
│   ├── src/                  # User interface, styles, and renderer logic
│   │   ├── index.html        # Main application layout
│   │   ├── app.js            # UI controller and event bindings
│   │   ├── ui-redesign.css   # Base application styles
│   │   └── ui-theme-plus.css # Dynamic themes, animations, and floating controls
│   ├── assets/               # Application icons, graphics, and NSIS scripts
│   │   ├── icon.ico / .png   # Brand identity assets
│   │   ├── installer.nsh     # NSIS installer hooks
│   │   ├── installerHeader.bmp
│   │   └── installerSidebar.bmp
│   ├── main.js               # Electron main process
│   ├── quest-engine.js       # Autonomous quest execution engine
│   └── qr-auth.js            # QR code authentication module
├── LICENSE                   # Open-source MIT license
└── README.md
```

---

## Quick Start

### Prerequisites
- **Node.js** (version 24 or newer recommended)
- **npm** (included with Node.js)
- Operating System: **Windows 10 / 11 (64-bit)**

### 1. Install Dependencies
```bash
cd desktop-app
npm install
```

### 2. Run in Development
```bash
npm start
```

---

## Building & Distribution

### Generate Production Installer (`Setup.exe`)
To package the standalone installer:
```bash
cd desktop-app
npm run build
```

The generated executable will be placed in:
`dist/Discord Orb Studio Setup.exe`

---

## Privacy & Security

- Session tokens are stored in Orb Studio’s local configuration file on this device; protect access to your Windows account.
- Orb Studio connects to Discord services to validate sessions and provide quest and reward features. The app does not include a third-party analytics service.
- Heartbeat emulation matches official Discord protocol structures to ensure account safety and stability.

---

## License & Author

This project is open-source software licensed under the **[MIT License](LICENSE)**.

Developed and maintained by **Helios** (2026).
