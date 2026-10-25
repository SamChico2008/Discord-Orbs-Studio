const fs = require('fs');
const cp = require('child_process');

const vbs = [
  'Set oWS = WScript.CreateObject("WScript.Shell")',
  'sLink = "C:\\Users\\SamChicoPC\\Desktop\\Simuler Jeux Quetes.lnk"',
  'Set oLink = oWS.CreateShortcut(sLink)',
  'oLink.TargetPath = "C:\\Users\\SamChicoPC\\.gemini\\antigravity-ide\\scratch\\dummy-games\\Simulateur_Quetes.bat"',
  'oLink.WorkingDirectory = "C:\\Users\\SamChicoPC\\.gemini\\antigravity-ide\\scratch\\dummy-games"',
  'oLink.Save'
].join('\r\n');

fs.writeFileSync('mkshortcut.vbs', vbs);
cp.execSync('cscript //nologo mkshortcut.vbs');
fs.unlinkSync('mkshortcut.vbs');
console.log('Shortcuts ready.');
