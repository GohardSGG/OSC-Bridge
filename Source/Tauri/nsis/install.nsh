!macro customInstall
  ; [CRITICAL] Grant Write/Modify permissions to "Users" group for the installation directory.
  ; This allows the application to write logs/configs locally even when launched as a Standard User
  ; (e.g. via the "Launch" checkbox at the end of installation).
  ; (OI)(CI) = Object Inherit, Container Inherit (applies to subfiles/folders)
  ; M = Modify access
  ExecWait 'icacls "$INSTDIR" /grant Users:(OI)(CI)M'

  ; Logic to handle config file
  ; Check if user's config.json exists
  IfFileExists "$INSTDIR\config.json" config_exists config_missing

  config_missing:
    ; No user config, rename the shipped default to be the active config
    Rename "$INSTDIR\config_default.json" "$INSTDIR\config.json"
    Goto end_config_logic

  config_exists:
    ; User config exists, keep it. Delete the shipped default to avoid clutter.
    Delete "$INSTDIR\config_default.json"

  end_config_logic:
!macroend

