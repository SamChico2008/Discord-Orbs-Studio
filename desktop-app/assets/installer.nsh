; Discord Orb Studio - NSIS Custom Hooks

!macro customInit
  ; Close running instance cleanly to prevent file locks during upgrade/install
  nsExec::Exec 'cmd /c taskkill /F /IM "Discord Orb Studio.exe" >nul 2>&1'
!macroend

!macro customUnInstall
  nsExec::Exec 'cmd /c taskkill /F /IM "Discord Orb Studio.exe" >nul 2>&1'
!macroend
