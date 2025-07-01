@echo off
echo 正在测试静默启动功能...
cd /d "C:\Code\OSC-Bridge\"

echo 1. 启动后端服务...
start "" "run.bat"

echo 2. 等待2秒...
timeout /t 2 >nul

echo 3. 启动Tauri应用（静默模式）...
start "" "src-tauri\target\debug\osc-bridge.exe" --silent

echo 静默启动测试完成！
echo 应用应该已经在系统托盘中运行，主窗口不会显示。
pause 