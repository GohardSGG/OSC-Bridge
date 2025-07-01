@echo off
echo 启动 OSC Bridge 应用...

REM 启动后端脚本（在后台运行）
start /B node osc-bridge.cjs

REM 等待1秒让后端启动
timeout /t 1 /nobreak >nul

REM 启动前端应用
npm run tauri dev

REM 如果前端退出，也终止后端进程
taskkill /f /im node.exe /fi "WINDOWTITLE eq osc-bridge*" 2>nul 