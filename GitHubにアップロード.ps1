# GitHub Upload Script
$ErrorActionPreference = "Stop"
$owner = "yutakatakahagink-cloud"
$repoName = "-"

$files = @(
    "index.html",
    "user.html",
    "admin.html",
    "owner.html",
    "config.js",
    "hh-data.js",
    "laws_refresh.js",
    "laws_data.json",
    "config.example.js",
    "config.firebase.json.example",
    "config.firebase.json",
    "start.bat",
    "README.md",
    "FirebaseConfig.md",
    "URLList.txt",
    "firebase-check.html"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GitHub Upload" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$token = Read-Host "GitHub token (hidden)" -AsSecureString
$tokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($token))
if ([string]::IsNullOrWhiteSpace($tokenPlain)) {
    Write-Host "Token is empty. Exit." -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "token $tokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$uploaded = 0
$failed = 0

foreach ($f in $files) {
    $path = Join-Path $scriptDir $f
    if (-not (Test-Path $path)) {
        Write-Host "  [SKIP] $f" -ForegroundColor Yellow
        continue
    }
    try {
        $content = [System.IO.File]::ReadAllBytes($path)
        $base64 = [Convert]::ToBase64String($content)
        $body = @{
            message = "Upload: $f"
            content = $base64
        } | ConvertTo-Json

        $uri = "https://api.github.com/repos/$owner/$repoName/contents/$f"
        $existing = $null
        try {
            $existing = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
        } catch { }

        if ($existing -and $existing.sha) {
            $body = @{
                message = "Update: $f"
                content = $base64
                sha = $existing.sha
            } | ConvertTo-Json
            Invoke-RestMethod -Uri $uri -Headers $headers -Method Put -Body $body -ContentType "application/json; charset=utf-8" | Out-Null
        } else {
            Invoke-RestMethod -Uri $uri -Headers $headers -Method Put -Body $body -ContentType "application/json; charset=utf-8" | Out-Null
        }
        Write-Host "  [OK] $f" -ForegroundColor Green
        $uploaded++
    } catch {
        Write-Host "  [FAIL] $f" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "Done: $uploaded uploaded, $failed failed" -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs:" -ForegroundColor White
$url1 = "https://yutakatakahagink-cloud.github.io/-/user.html"
$url2 = "https://yutakatakahagink-cloud.github.io/-/admin.html"
$url3 = "https://yutakatakahagink-cloud.github.io/-/owner.html"
Write-Host "  $url1" -ForegroundColor Yellow
Write-Host "  $url2" -ForegroundColor Yellow
Write-Host "  $url3" -ForegroundColor Yellow
Write-Host ""
