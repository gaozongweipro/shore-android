param(
    [Parameter(Mandatory=$true)][string]$Java,
    [Parameter(Mandatory=$true)][string]$Apktool,
    [Parameter(Mandatory=$true)][string]$Apksigner,
    [Parameter(Mandatory=$true)][string]$Keystore,
    [Parameter(Mandatory=$true)][string]$StorePasswordFile,
    [string]$FrameworkDirectory,
    [string]$Python = 'python'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$stage = Join-Path $projectRoot 'build\offline'
$outDir = Join-Path $projectRoot 'dist'
New-Item -ItemType Directory -Path $stage,$outDir -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'offline\apktool.yml') -Destination $stage -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'offline\AndroidManifest.xml') -Destination $stage -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'offline\smali') -Destination $stage -Recurse -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'app\src\main\assets') -Destination $stage -Recurse -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'app\src\main\res') -Destination $stage -Recurse -Force
if (!$FrameworkDirectory) { $FrameworkDirectory = Join-Path $projectRoot 'build\framework' }
$unsigned = Join-Path $outDir 'shore-unsigned.apk'
$alignedUnsigned = Join-Path $outDir 'shore-aligned-unsigned.apk'
$versionLine = Get-Content -LiteralPath (Join-Path $projectRoot 'offline\apktool.yml') | Where-Object { $_ -match '^  versionName:' }
$appVersion = ($versionLine -replace '^  versionName:\s*', '').Trim()
if ($appVersion -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid app version' }
$signed = Join-Path $outDir "shore-android-v$appVersion.apk"
& $Java -jar $Apktool b $stage -p $FrameworkDirectory -o $unsigned
if ($LASTEXITCODE -ne 0) { throw 'APK build failed' }
& $Python (Join-Path $PSScriptRoot 'align-apk.py') $unsigned $alignedUnsigned
if ($LASTEXITCODE -ne 0) { throw 'APK alignment failed' }
& $Java -jar $Apksigner sign --ks $Keystore --ks-key-alias shore --ks-pass "file:$StorePasswordFile" --v1-signing-enabled true --v2-signing-enabled true --out $signed $alignedUnsigned
if ($LASTEXITCODE -ne 0) { throw 'APK signing failed' }
& $Java -jar $Apksigner verify --verbose --print-certs $signed
if ($LASTEXITCODE -ne 0) { throw 'APK verification failed' }
Get-FileHash -LiteralPath $signed -Algorithm SHA256
