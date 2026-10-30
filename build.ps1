Write-Host "==> [1/3] Building React 19 + HeroUI Frontend..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\frontend"
pnpm build

Write-Host "==> [2/3] Syncing dist to Go embed directory..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot"
Copy-Item -Recurse -Force "$PSScriptRoot\frontend\dist" "$PSScriptRoot\backend\dist"

Write-Host "==> [3/3] Compiling Go Single-Binary..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\backend"
go build -ldflags="-s -w" -o mail-server.exe .

Set-Location -Path "$PSScriptRoot"
Write-Host "✔ Build Successful! Binary created at backend\mail-server.exe" -ForegroundColor Green
