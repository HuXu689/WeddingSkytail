param([switch]$Apply)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$composeArgs = @('compose', '--env-file', (Join-Path $root '.env'), '-f', (Join-Path $root 'deploy/compose.yml'))
if ($Apply) {
  # Custom-format pg_dump stays binary: do not pipe it through PowerShell text output.
  $backupDir = Join-Path $root '.qa-artifacts/db-backups'
  New-Item -ItemType Directory -Force $backupDir | Out-Null
  $name = "before-test-cleanup-$([DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss-fff')).dump"
  & docker @composeArgs exec -T db pg_dump -U wedding -d wedding -Fc -f "/tmp/$name"
  if ($LASTEXITCODE -ne 0) { throw 'Backup thất bại. Không dọn dữ liệu.' }
  & docker @composeArgs cp "db:/tmp/$name" (Join-Path $backupDir $name)
  if ($LASTEXITCODE -ne 0) { throw 'Không lưu được backup. Không dọn dữ liệu.' }
  if ((Get-Item (Join-Path $backupDir $name)).Length -eq 0) { throw 'Backup rỗng. Không dọn dữ liệu.' }
  Write-Host "Backup: $(Join-Path $backupDir $name)"
}
$applyValue = if ($Apply) { 'true' } else { 'false' }
Get-Content -Raw (Join-Path $PSScriptRoot 'cleanup-test-data.sql') |
  & docker @composeArgs exec -T db psql -X -U wedding -d wedding -v "apply=$applyValue"
if ($LASTEXITCODE -ne 0) { throw 'Dọn dữ liệu thất bại; transaction đã rollback.' }
if (-not $Apply) { Write-Host 'Chỉ xem trước, chưa xóa. Dùng -Apply để sao lưu rồi dọn.' }