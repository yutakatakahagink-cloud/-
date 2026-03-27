@echo off
chcp 65001 >nul
echo ========================================
echo  安全衛生管理システム - ローカルサーバー起動
echo ========================================
echo.

cd /d "%~dp0"

REM Python の http.server を試す
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Python でサーバーを起動しています...
    echo.
    echo ブラウザで以下を開いてください:
    echo   http://localhost:8080
    echo.
    echo ※ 携帯・他PCからアクセスするには GitHub Pages 等へデプロイが必要です。
    echo   README.md の「携帯・他PCからアクセスするには」を参照してください。
    echo.
    echo 終了するには Ctrl+C を押してください。
    echo.
    start http://localhost:8080
    python -m http.server 8080
    goto :eof
)

REM Node.js の npx serve を試す
where npx >nul 2>&1
if %errorlevel% equ 0 (
    echo Node.js でサーバーを起動しています...
    echo.
    echo ブラウザが自動で開きます。
    echo ※ 携帯・他PCからアクセスするには GitHub Pages 等へデプロイが必要です。
    echo.
    echo 終了するには Ctrl+C を押してください。
    echo.
    start http://localhost:3000
    npx -y serve -p 3000
    goto :eof
)

REM どちらもない場合
echo [エラー] Python または Node.js が見つかりません。
echo.
echo 以下のいずれかをインストールしてください:
echo   1. Python: https://www.python.org/downloads/
echo   2. Node.js: https://nodejs.org/
echo.
echo または、index.html をブラウザで直接開いても使用できます。
echo （ファイルをダブルクリックするか、ブラウザにドラッグ＆ドロップ）
echo.
pause
