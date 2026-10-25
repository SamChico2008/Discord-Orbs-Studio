!include "nsDialogs.nsh"
!include "WinMessages.nsh"
!include "LogicLib.nsh"

; ===================================================================
; Discord Orb Studio — Modern Custom Installer
; Immersive dark theme, full-width welcome page, and fluid integration
; ===================================================================

!define /redef MUI_BGCOLOR "161519"
!define /redef MUI_TEXTCOLOR "F4F2EE"
!define /redef MUI_INSTFILESPAGE_COLORS "B8ADF2 1E1D24"
!define /redef MUI_INSTFILESPAGE_PROGRESSBAR "smooth"

!ifndef DWMWA_USE_IMMERSIVE_DARK_MODE
  !define DWMWA_USE_IMMERSIVE_DARK_MODE 20
!endif
!ifndef DWMWA_USE_IMMERSIVE_DARK_MODE_OLD
  !define DWMWA_USE_IMMERSIVE_DARK_MODE_OLD 19
!endif

!ifndef BUILD_UNINSTALLER
; Custom dialog variables
Var OrbBannerImg
Var OrbPathDisplay
Var OrbFontBold
Var OrbFinishBannerImg
Var OrbLaunchCheckbox
Var OrbLaunchState
!endif

!ifndef BUILD_UNINSTALLER
  !define /redef MUI_CUSTOMFUNCTION_GUIINIT OrbGlobalGuiInit
!else
  !define /redef MUI_CUSTOMFUNCTION_UNGUIINIT un.OrbGlobalGuiInit
!endif

; -------------------------------------------------------------------
; GUI Initialization: Windows native dark mode & seamless borders
; -------------------------------------------------------------------
!macro OrbThemeFunctions prefix
  Function ${prefix}OrbGlobalGuiInit
    Push $R0
    ; 1. Native dark title bar (Windows 10 20H1+ & Windows 11)
    System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i ${DWMWA_USE_IMMERSIVE_DARK_MODE}, *i 1, i 4)'
    System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i ${DWMWA_USE_IMMERSIVE_DARK_MODE_OLD}, *i 1, i 4)'

    ; 2. Explorer dark theme on window
    System::Call 'uxtheme::SetWindowTheme(p $HWNDPARENT, w "DarkMode_Explorer", w NULL)'

    ; 3. Background colors
    SetCtlColors $HWNDPARENT "F4F2EE" "161519"
    SetCtlColors $mui.Branding.Text "787582" "161519"
    SetCtlColors $mui.Branding.Background "" "161519"

    ; 4. Hide legacy white separator lines
    GetDlgItem $R0 $HWNDPARENT 1028 ; Bottom separator
    ShowWindow $R0 ${SW_HIDE}
    GetDlgItem $R0 $HWNDPARENT 1035 ; Header separator 1
    ShowWindow $R0 ${SW_HIDE}
    GetDlgItem $R0 $HWNDPARENT 1036 ; Header separator 2
    ShowWindow $R0 ${SW_HIDE}

    ; 5. Internal pages (Installation progress): dark header
    GetDlgItem $R0 $HWNDPARENT 1034
    SetCtlColors $R0 "F4F2EE" "161519"
    GetDlgItem $R0 $HWNDPARENT 1037
    SetCtlColors $R0 "F4F2EE" "161519"
    GetDlgItem $R0 $HWNDPARENT 1038
    SetCtlColors $R0 "B8ADF2" "161519"
    GetDlgItem $R0 $HWNDPARENT 1039
    SetCtlColors $R0 "" "161519"

    ; 6. Native buttons dark theme
    GetDlgItem $R0 $HWNDPARENT 1
    System::Call 'uxtheme::SetWindowTheme(p $R0, w "DarkMode_Explorer", w NULL)'
    GetDlgItem $R0 $HWNDPARENT 2
    System::Call 'uxtheme::SetWindowTheme(p $R0, w "DarkMode_Explorer", w NULL)'
    GetDlgItem $R0 $HWNDPARENT 3
    System::Call 'uxtheme::SetWindowTheme(p $R0, w "DarkMode_Explorer", w NULL)'

    Pop $R0
  FunctionEnd
!macroend

!macro customHeader
  SetFont "Segoe UI" 9
  BrandingText "Discord Orb Studio  |  Desktop Edition"
  !ifndef BUILD_UNINSTALLER
    !insertmacro OrbThemeFunctions ""
  !else
    !insertmacro OrbThemeFunctions "un."
  !endif
!macroend

!ifndef BUILD_UNINSTALLER
; -------------------------------------------------------------------
; PAGE 1: MAIN SETUP PAGE (FULL-WIDTH MODERN WIZARD)
; -------------------------------------------------------------------
!macro customWelcomePage
  PageEx custom
    PageCallbacks OrbWelcomeCreate OrbWelcomeLeave
    Caption " "
  PageExEnd
!macroend

Function OrbWelcomeCreate
  InitPluginsDir
  File /oname=$PLUGINSDIR\installerBanner.bmp "${PROJECT_DIR}\assets\installerBanner.bmp"

  nsDialogs::Create 1018
  Pop $0
  SetCtlColors $0 "F4F2EE" "161519"

  CreateFont $OrbFontBold "Segoe UI" 9 700

  ; 1. Top high-res header banner
  ${NSD_CreateBitmap} 0 0 100% 64u ""
  Pop $0
  ${NSD_SetImage} $0 "$PLUGINSDIR\installerBanner.bmp" $OrbBannerImg

  ; 2. Key features
  ${NSD_CreateLabel} 14u 70u 272u 10u "  Automated Background Quest Progression"
  Pop $0
  SendMessage $0 ${WM_SETFONT} $OrbFontBold 1
  SetCtlColors $0 "F4F2EE" "161519"

  ${NSD_CreateLabel} 22u 81u 264u 9u "Advance your Discord quests smoothly without running demanding games."
  Pop $0
  SetCtlColors $0 "A6A5AD" "161519"

  ${NSD_CreateLabel} 14u 94u 272u 10u "  Multi-Account & Stealth Cadence"
  Pop $0
  SendMessage $0 ${WM_SETFONT} $OrbFontBold 1
  SetCtlColors $0 "F4F2EE" "161519"

  ${NSD_CreateLabel} 22u 105u 264u 9u "Natural heartbeat rhythms, centralized reward vault, zero clutter."
  Pop $0
  SetCtlColors $0 "A6A5AD" "161519"

  ; 3. Destination folder selector
  ${NSD_CreateLabel} 14u 119u 140u 9u "Installation folder:"
  Pop $0
  SetCtlColors $0 "787582" "161519"

  ${NSD_CreateLabel} 14u 129u 220u 12u "$INSTDIR"
  Pop $OrbPathDisplay
  SendMessage $OrbPathDisplay ${WM_SETFONT} $OrbFontBold 1
  SetCtlColors $OrbPathDisplay "B8ADF2" "161519"

  ${NSD_CreateButton} 238u 125u 52u 16u "Browse..."
  Pop $0
  System::Call 'uxtheme::SetWindowTheme(p $0, w "DarkMode_Explorer", w NULL)'
  ${NSD_OnClick} $0 OnBrowseDestination

  ; Update parent window buttons
  GetDlgItem $0 $HWNDPARENT 1
  SendMessage $0 ${WM_SETTEXT} 0 "STR:Install Studio"
  System::Call 'uxtheme::SetWindowTheme(p $0, w "DarkMode_Explorer", w NULL)'

  GetDlgItem $0 $HWNDPARENT 2
  SendMessage $0 ${WM_SETTEXT} 0 "STR:Cancel"
  System::Call 'uxtheme::SetWindowTheme(p $0, w "DarkMode_Explorer", w NULL)'

  GetDlgItem $0 $HWNDPARENT 3
  ShowWindow $0 ${SW_HIDE}

  nsDialogs::Show
FunctionEnd

Function OnBrowseDestination
  Pop $0
  nsDialogs::SelectFolderDialog "Select where to install Discord Orb Studio" "$INSTDIR"
  Pop $0
  ${If} $0 != "error"
    StrCpy $INSTDIR "$0"
    ${NSD_SetText} $OrbPathDisplay "$INSTDIR"
  ${EndIf}
FunctionEnd

Function OrbWelcomeLeave
  ${NSD_FreeImage} $OrbBannerImg
FunctionEnd

; -------------------------------------------------------------------
; PAGE 2: FINISH PAGE
; -------------------------------------------------------------------
!macro customFinishPage
  PageEx custom
    PageCallbacks OrbFinishCreate OrbFinishLeave
    Caption " "
  PageExEnd
!macroend

Function OrbFinishCreate
  InitPluginsDir
  File /oname=$PLUGINSDIR\installerFinishBanner.bmp "${PROJECT_DIR}\assets\installerFinishBanner.bmp"

  nsDialogs::Create 1018
  Pop $0
  SetCtlColors $0 "F4F2EE" "161519"

  ; Top success banner
  ${NSD_CreateBitmap} 0 0 100% 64u ""
  Pop $0
  ${NSD_SetImage} $0 "$PLUGINSDIR\installerFinishBanner.bmp" $OrbFinishBannerImg

  ${NSD_CreateLabel} 14u 75u 272u 12u "Your studio is ready to run."
  Pop $0
  SendMessage $0 ${WM_SETFONT} $OrbFontBold 1
  SetCtlColors $0 "F4F2EE" "161519"

  ${NSD_CreateLabel} 14u 89u 272u 20u "Discord Orb Studio has been installed successfully. Your preferences and sessions will be automatically preserved across updates."
  Pop $0
  SetCtlColors $0 "A6A5AD" "161519"

  ${NSD_CreateCheckbox} 14u 118u 272u 12u "Launch Discord Orb Studio now"
  Pop $OrbLaunchCheckbox
  SendMessage $OrbLaunchCheckbox ${WM_SETFONT} $OrbFontBold 1
  SetCtlColors $OrbLaunchCheckbox "F4F2EE" "161519"
  ${NSD_Check} $OrbLaunchCheckbox

  ; Finish button
  GetDlgItem $0 $HWNDPARENT 1
  SendMessage $0 ${WM_SETTEXT} 0 "STR:Finish"
  System::Call 'uxtheme::SetWindowTheme(p $0, w "DarkMode_Explorer", w NULL)'

  GetDlgItem $0 $HWNDPARENT 2
  ShowWindow $0 ${SW_HIDE}

  GetDlgItem $0 $HWNDPARENT 3
  ShowWindow $0 ${SW_HIDE}

  nsDialogs::Show
FunctionEnd

Function OrbFinishLeave
  ${NSD_FreeImage} $OrbFinishBannerImg
  ${NSD_GetState} $OrbLaunchCheckbox $OrbLaunchState
  ${If} $OrbLaunchState == ${BST_CHECKED}
    ExecShell "open" "$INSTDIR\Discord Orb Studio.exe"
  ${EndIf}
FunctionEnd
!endif

; -------------------------------------------------------------------
; UNINSTALLER
; -------------------------------------------------------------------
!ifdef BUILD_UNINSTALLER
!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Uninstall Discord Orb Studio"
  !define MUI_WELCOMEPAGE_TEXT "This wizard will remove Discord Orb Studio from your computer.$\r$\n$\r$\nYour saved accounts and local settings will remain preserved in AppData for future installations.$\r$\n$\r$\nClick Uninstall to proceed."
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW un.OrbUnWelcomeShow
  !insertmacro MUI_UNPAGE_WELCOME
!macroend

Function un.OrbUnWelcomeShow
  Push $R0
  System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i ${DWMWA_USE_IMMERSIVE_DARK_MODE}, *i 1, i 4)'
  System::Call 'uxtheme::SetWindowTheme(p $HWNDPARENT, w "DarkMode_Explorer", w NULL)'
  GetDlgItem $R0 $HWNDPARENT 1028
  ShowWindow $R0 ${SW_HIDE}
  SetCtlColors $HWNDPARENT "F4F2EE" "161519"
  GetDlgItem $R0 $HWNDPARENT 1
  System::Call 'uxtheme::SetWindowTheme(p $R0, w "DarkMode_Explorer", w NULL)'
  SendMessage $R0 ${WM_SETTEXT} 0 "STR:Uninstall"
  GetDlgItem $R0 $HWNDPARENT 2
  System::Call 'uxtheme::SetWindowTheme(p $R0, w "DarkMode_Explorer", w NULL)'
  SendMessage $R0 ${WM_SETTEXT} 0 "STR:Cancel"
  Pop $R0
FunctionEnd
!endif

; -------------------------------------------------------------------
; Process cleanup before install/uninstall
; -------------------------------------------------------------------
!macro customInit
  nsExec::Exec 'cmd /c taskkill /F /IM "Discord Orb Studio.exe" >nul 2>&1'
!macroend

!macro customUnInstall
  nsExec::Exec 'cmd /c taskkill /F /IM "Discord Orb Studio.exe" >nul 2>&1'
!macroend
