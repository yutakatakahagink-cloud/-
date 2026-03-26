# ============================================
# 1. GitHub の既存ファイルを削除
# 2. 新しいファイルをアップロード
# ============================================
# 使い方：「削除して新規アップロード.bat」をダブルクリック
# トークン：「トークンの作り方.txt」参照
# ============================================

$ErrorActionPreference = "Stop"
$owner = "yutakatakahagink-cloud"
$repoName = "-"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# 削除対象（日本語名・英語名）
$toDelete = @("管理者.html","所有者.html","ユーザー.html","admin.html","owner.html","user.html","index.html","config.js","hh-data.js","laws_refresh.js","laws_data.json","config.example.js","start.bat","README.md","URLList.txt","FirebaseConfig.md","config.firebase.json.example","config.firebase.json")

# アップロード対象
$toUpload = @("index.html","user.html","admin.html","owner.html","config.js","hh-data.js","laws_refresh.js","laws_data.json","config.example.js","config.firebase.json.example","config.firebase.json","start.bat","README.md","URLList.txt","FirebaseConfig.md")

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  削除 → 新規アップロード" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$token = Read-Host "GitHub トークンを入力してください（トークンの作り方.txt 参照）" -AsSecureString
$tokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($token))
if ([string]::IsNullOrWhiteSpace($tokenPlain)) {
    Write-Host "トークンが入力されていません。終了します。" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "token $tokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

# === ステップ1: 削除 ===
Write-Host "[ステップ1] 既存ファイルを削除しています..." -ForegroundColor Yellow
$deleted = 0
foreach ($f in $toDelete) {
    try {
        $enc = [System.Uri]::EscapeDataString($f)
        $uri = "https://api.github.com/repos/$owner/$repoName/contents/$enc"
        $ex = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
        if ($ex -and $ex.sha) {
            $body = @{ message = "削除: $f"; sha = $ex.sha } | ConvertTo-Json
            Invoke-RestMethod -Uri $uri -Headers $headers -Method Delete -Body $body -ContentType "application/json; charset=utf-8" | Out-Null
            Write-Host "  削除: $f" -ForegroundColor Green
            $deleted++
        }
    } catch { }
}
Write-Host "  $deleted 件削除しました" -ForegroundColor Cyan
Write-Host ""

# === ステップ2: アップロード ===
Write-Host "[ステップ2] 新しいファイルをアップロードしています..." -ForegroundColor Yellow
$uploaded = 0
foreach ($f in $toUpload) {
    $path = Join-Path $scriptDir $f
    if (-not (Test-Path $path)) { continue }
    try {
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $base64 = [Convert]::ToBase64String($bytes)
        $enc = [System.Uri]::EscapeDataString($f)
        $uri = "https://api.github.com/repos/$owner/$repoName/contents/$enc"
        $body = @{ message = "アップロード: $f"; content = $base64 } | ConvertTo-Json
        Invoke-RestMethod -Uri $uri -Headers $headers -Method Put -Body $body -ContentType "application/json; charset=utf-8" | Out-Null
        Write-Host "  アップロード: $f" -ForegroundColor Green
        $uploaded++
    } catch {
        Write-Host "  失敗: $f" -ForegroundColor Red
    }
}
Write-Host "  $uploaded 件アップロードしました" -ForegroundColor Cyan
Write-Host ""
Write-Host "完了！数分後に他端末から開けます：" -ForegroundColor White
Write-Host "  https://yutakatakahagink-cloud.github.io/-/user.html" -ForegroundColor Yellow
Write-Host "  https://yutakatakahagink-cloud.github.io/-/admin.html" -ForegroundColor Yellow
Write-Host "  https://yutakatakahagink-cloud.github.io/-/owner.html" -ForegroundColor Yellow
Write-Host ""
Read-Host "Enter キーで終了"
