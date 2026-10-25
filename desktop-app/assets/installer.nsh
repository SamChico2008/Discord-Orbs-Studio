!include "nsDialogs.nsh"
!include "WinMessages.nsh"
!include "LogicLib.nsh"

; ===================================================================
; Discord Orb Studio — Installateur moderne et personnalisé
; Thème sombre immersif, page d'accueil plein écran et intégration fluide
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
; Variables actives nécessaires aux écrans personnalisés
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
; Initialisation graphique : Mode sombre Windows natif & masquage bordures
; -------------------------------------------------------------------
!macro OrbThemeFunctions prefix
  Function ${prefix}OrbGlobalGuiInit
    Push $R0
    ; 1. Barre de titre sombre native (Windows 10 20H1+ & Windows 11)
    System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i ${DWMWA_USE_IMMERSIVE_DARK_MODE}, *i 1, i 4)'
    System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i ${DWMWA_USE_IMMERSIVE_DARK_MODE_OLD}, *i 1, i 4)'

    ; 2. Thème sombre Explorer sur la fenêtre
    System::Call 'uxtheme::SetWindowTheme(p $HWNDPARENT, w "DarkMode_Explorer", w NULL)'

    ; 3. Couleurs du fond
    SetCtlColors $HWNDPARENT "F4F2EE" "161519"
    SetCtlColors $mui.Branding.Text "787582" "161519"
    SetCtlColors $mui.Branding.Background "" "161519"

    ; 4. Masquer les lignes blanches de séparation
    GetDlgItem $R0 $HWNDPARENT 1028 ; Séparateur bas
    ShowWindow $R0 ${SW_HIDE}
    GetDlgItem $R0 $HWNDPARENT 1035 ; Séparateur en-tête 1
    ShowWindow $R0 ${SW_HIDE}
    GetDlgItem $R0 $HWNDPARENT 1036 ; Séparateur en-tête 2
    ShowWindow $R0 ${SW_HIDE}

    ; 5. Pages internes (Progression) : en-tête sombre
    GetDlgItem $R0 $HWNDPARENT 1034
    SetCtlColors $R0 "F4F2EE" "161519"
    GetDlgItem $R0 $HWNDPARENT 1037
    SetCtlColors $R0 "F4F2EE" "161519"
    GetDlgItem $R0 $HWNDPARENT 1038
    SetCtlColors $R0 "B8ADF2" "161519"
    GetDlgItem $R0 $HWNDPARENT 1039
    SetCtlColors $R0 "" "161519"

    ; 6. Thème sombre sur les boutons natifs
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
  BrandingText "Discord Orb Studio  |  Édition Bureau"
  !ifndef BUILD_UNINSTALLER
    !insertmacro OrbThemeFunctions ""
  !else
    !insertmacro OrbThemeFunctions "un."
  !endif
!macroend

!ifndef BUILD_UNINSTALLER
; -------------------------------------------------------------------
; PAGE 1 : ÉCRAN D'INSTALLATION PRINCIPAL (PLEIN ÉCRAN, SANS SPLIT RETRO)
; -------------------------------------------------------------------
!macro customWelcomePage
  PageEx custom
    PageCallbacks OrbWelcomeCreate OrbWelcomeLeave
    Caption " "
  PageExEnd
!macroend

Function OrbWelcomeCreate
  ; Extraire la bannière d'en-tête haute définition
  InitPluginsDir
  File /oname=$PLUGINSDIR\installerBanner.bmp "${PROJECT_DIR}\assets\installerBanner.bmp"

  ; Créer la boîte de dialogue nsDialogs (remplit toute la surface utile)
  nsDialogs::Create 1018
  Pop $0
  SetCtlColors $0 "F4F2EE" "161519"

  ; Création de la police d'accentuation
  CreateFont $OrbFontBold "Segoe UI" 9 700

  ; 1. Bannière supérieure haute définition (logo, orbite, titre et badge)
  ${NSD_CreateBitmap} 0 0 100% 64u ""
  Pop $0
  ${NSD_SetImage} $0 "$PLUGINSDIR\installerBanner.bmp" $OrbBannerImg

  ; 2. Points forts du studio
  ${NSD_CreateLabel} 14u 70u 272u 10u "  Quêtes automatisées en tâche de fond"
  Pop $0
  SendMessage $0 ${WM_SETFONT} $OrbFontBold 1
  SetCtlColors $0 "F4F2EE" "161519"

  ${NSD_CreateLabel} 22u 81u 264u 9u "Progression de vos quêtes Discord sans lancer ni installer les jeux."
  Pop $0
  SetCtlColors $0 "A6A5AD" "161519"

  ${NSD_CreateLabel} 14u 94u 272u 10u "  Multi-comptes sécurisé & mode furtif"
  Pop $0
  SendMessage $0 ${WM_SETFONT} $OrbFontBold 1
  SetCtlColors $0 "F4F2EE" "161519"

  ${NSD_CreateLabel} 22u 105u 264u 9u "Simulation Discord conforme, coffres centralisés et zéro trace."
  Pop $0
  SetCtlColors $0 "A6A5AD" "161519"

  ; 3. Sélecteur de dossier intégré (élégant, direct, sans page supplémentaire)
  ${NSD_CreateLabel} 14u 119u 140u 9u "Dossier d'installation :"
  Pop $0
  SetCtlColors $0 "787582" "161519"

  ${NSD_CreateLabel} 14u 129u 220u 12u "$INSTDIR"
  Pop $OrbPathDisplay
  SendMessage $OrbPathDisplay ${WM_SETFONT} $OrbFontBold 1
  SetCtlColors $OrbPathDisplay "B8ADF2" "161519"

  ${NSD_CreateButton} 238u 125u 52u 16u "Modifier..."
  Pop $0
  System::Call 'uxtheme::SetWindowTheme(p $0, w "DarkMode_Explorer", w NULL)'
  ${NSD_OnClick} $0 OnBrowseDestination

  ; Mettre à jour le texte des boutons de la fenêtre parente
  GetDlgItem $0 $HWNDPARENT 1
  SendMessage $0 ${WM_SETTEXT} 0 "STR:Installer le studio"
  System::Call 'uxtheme::SetWindowTheme(p $0, w "DarkMode_Explorer", w NULL)'

  GetDlgItem $0 $HWNDPARENT 2
  SendMessage $0 ${WM_SETTEXT} 0 "STR:Quitter"
  System::Call 'uxtheme::SetWindowTheme(p $0, w "DarkMode_Explorer", w NULL)'

  GetDlgItem $0 $HWNDPARENT 3
  ShowWindow $0 ${SW_HIDE}

  nsDialogs::Show
FunctionEnd

Function OnBrowseDestination
  Pop $0
  nsDialogs::SelectFolderDialog "Choisissez où installer Discord Orb Studio" "$INSTDIR"
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
; PAGE 2 : ÉCRAN DE FIN PERSONNALISÉ (CONFIRMATION ET LANCEMENT)
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

  ; Bannière haute définition succès
  ${NSD_CreateBitmap} 0 0 100% 64u ""
  Pop $0
  ${NSD_SetImage} $0 "$PLUGINSDIR\installerFinishBanner.bmp" $OrbFinishBannerImg

  ${NSD_CreateLabel} 14u 75u 272u 12u "Votre studio est opérationnel."
  Pop $0
  SendMessage $0 ${WM_SETFONT} $OrbFontBold 1
  SetCtlColors $0 "F4F2EE" "161519"

  ${NSD_CreateLabel} 14u 89u 272u 20u "Discord Orb Studio a été installé avec succès. Vos préférences et vos sessions seront conservées automatiquement lors des mises à jour."
  Pop $0
  SetCtlColors $0 "A6A5AD" "161519"

  ${NSD_CreateCheckbox} 14u 118u 272u 12u "Ouvrir Discord Orb Studio maintenant"
  Pop $OrbLaunchCheckbox
  SendMessage $OrbLaunchCheckbox ${WM_SETFONT} $OrbFontBold 1
  SetCtlColors $OrbLaunchCheckbox "F4F2EE" "161519"
  ${NSD_Check} $OrbLaunchCheckbox

  ; Bouton Terminer
  GetDlgItem $0 $HWNDPARENT 1
  SendMessage $0 ${WM_SETTEXT} 0 "STR:Terminer"
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
; DÉSINSTALLATEUR : Écran propre et moderne
; -------------------------------------------------------------------
!ifdef BUILD_UNINSTALLER
!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Désinstallation du studio."
  !define MUI_WELCOMEPAGE_TEXT "Cet assistant retire Discord Orb Studio de votre ordinateur.$\r$\n$\r$\nVos comptes enregistrés et vos données locales sont préservés pour une réinstallation future.$\r$\n$\r$\nCliquez sur Désinstaller pour continuer."
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
  SendMessage $R0 ${WM_SETTEXT} 0 "STR:Désinstaller"
  GetDlgItem $R0 $HWNDPARENT 2
  System::Call 'uxtheme::SetWindowTheme(p $R0, w "DarkMode_Explorer", w NULL)'
  SendMessage $R0 ${WM_SETTEXT} 0 "STR:Annuler"
  Pop $R0
FunctionEnd
!endif

; -------------------------------------------------------------------
; Fermeture propre de toute instance active avant installation
; -------------------------------------------------------------------
!macro customInit
  nsExec::Exec 'cmd /c taskkill /F /IM "Discord Orb Studio.exe" >nul 2>&1'
!macroend

!macro customUnInstall
  nsExec::Exec 'cmd /c taskkill /F /IM "Discord Orb Studio.exe" >nul 2>&1'
!macroend
