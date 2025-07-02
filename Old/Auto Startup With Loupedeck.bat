@echo off
cd /d "C:\Code\OSC-Bridge\"
start "" "run.bat"
timeout /t 5 >nul
start "" "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Loupedeck\Loupedeck.lnk"