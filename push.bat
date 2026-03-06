@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo === HR Calendar System — 推送到 GitHub ===
echo.

git add .
git status

echo.
set /p MSG="請輸入版本說明（直接 Enter 使用預設）: "
if "%MSG%"=="" set MSG=update: UI fixes and feature improvements

git commit -m "%MSG%"
git push origin main

echo.
echo === 推送完成！===
echo.
pause
