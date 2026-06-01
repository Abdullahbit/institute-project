# Connect local repo to GitHub and push main + dev.
# Usage:
#   $env:GITHUB_REPO_URL = "https://github.com/USER/institute-platform.git"
#   .\scripts\setup-github-remote.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RepoRoot

if (-not $env:GITHUB_REPO_URL) {
  Write-Host "GITHUB_REPO_URL tanımlı değil." -ForegroundColor Yellow
  Write-Host 'Örnek: $env:GITHUB_REPO_URL = "https://github.com/KULLANICI/institute-platform.git"'
  exit 1
}

$url = $env:GITHUB_REPO_URL.Trim()

$remotes = git remote 2>$null
if ($remotes -match "^origin$") {
  Write-Host "origin zaten var, URL güncelleniyor..."
  git remote set-url origin $url
} else {
  git remote add origin $url
}

Write-Host "Fetching origin..."
git fetch origin

# dev branch (local)
$branches = git branch --format="%(refname:short)"
if ($branches -notcontains "dev") {
  git branch dev
  Write-Host "Local 'dev' branch oluşturuldu."
}

Write-Host ""
Write-Host "Push için (ilk sefer):" -ForegroundColor Cyan
Write-Host "  git push -u origin main"
Write-Host "  git push -u origin dev"
Write-Host ""
Write-Host "Günlük çalışma:" -ForegroundColor Cyan
Write-Host "  git checkout dev"
Write-Host "  git pull origin dev"
Write-Host "  git checkout -b feature/isim"
Write-Host ""
Write-Host "Kurallar: docs/GITHUB_WORKFLOW.md"
