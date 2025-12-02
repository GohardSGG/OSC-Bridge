!macro customInstall
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

