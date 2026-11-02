$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 24 LTS first.' }
    & node 'scripts/prepare-release.mjs'
    if ($LASTEXITCODE -ne 0) { throw 'Release preparation failed.' }
    $releaseVersion = & node -e "const fs=require('fs'),vm=require('vm'),c={};vm.runInNewContext(fs.readFileSync('2_WEBSITE/COPY_TO_GITHUB/app-config.js','utf8'),c);process.stdout.write(c.BAG_DAY_CONFIG.version)"
    if ($LASTEXITCODE -ne 0 -or $releaseVersion -notmatch '^\d+\.\d+\.\d+$') { throw 'Cannot read the central app version.' }
    $releaseZip = Join-Path $PSScriptRoot ('BagDay_Frontend_v' + $releaseVersion + '.zip')
    $releaseFiles = @('0_START_HERE.txt', '1_GOOGLE_ANALYTICS_SETUP.txt', '2_WEBSITE', '3_VALIDATION', 'scripts', 'Build_Release.ps1')
    Compress-Archive -Path $releaseFiles -DestinationPath $releaseZip -Force
    Write-Host ('READY: ' + $releaseZip)
} catch {
    Write-Host ('STOPPED: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
} finally { Pop-Location }
