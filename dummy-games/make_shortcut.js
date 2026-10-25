const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const targetBat = path.resolve(__dirname, 'Simulateur_Quetes.bat');
const workingDir = __dirname;
const desktopPath = path.join(process.env.USERPROFILE || 'C:\\', 'Desktop', 'Simulate Discord Quests.lnk');

const vbs = [
  'Set oWS = WScript.CreateObject("WScript.Shell")',
  `sLink = "${desktopPath.replace(/\\/g, '\\\\')}"`,
  'Set oLink = oWS.CreateShortcut(sLink)',
  `oLink.TargetPath = "${targetBat.replace(/\\/g, '\\\\')}"`,
  `oLink.WorkingDirectory = "${workingDir.replace(/\\/g, '\\\\')}"`,
  'oLink.Save'
].join('\r\n');

fs.writeFileSync('mkshortcut.vbs', vbs);
cp.execSync('cscript //nologo mkshortcut.vbs');
fs.unlinkSync('mkshortcut.vbs');
console.log('Shortcuts ready.');
