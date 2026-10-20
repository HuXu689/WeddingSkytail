$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$name = 'wedding-feature-qa-' + [guid]::NewGuid().ToString('N').Substring(0,12)
$previousDatabase = $env:FEATURE_QA_DATABASE
$started = $false
Push-Location $root
try {
    # Local cached image only; never pull, load .env, reuse containers or mount application volumes.
    docker image inspect postgres:17-alpine --format '{{.Id}}' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL 17 image is not cached. No image was downloaded.' }
    docker run --detach --rm --pull=never --name $name --label wedding.feature-qa=disposable --tmpfs /var/lib/postgresql/data -p '127.0.0.1::5432' -e POSTGRES_DB=feature_qa -e POSTGRES_USER=feature_qa -e POSTGRES_PASSWORD=Disposable-Fixture-Only-2026 postgres:17-alpine | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Cannot start isolated PostgreSQL.' }
    $started = $true
    $ready = $false
    for ($attempt=0; $attempt -lt 40; $attempt++) {
        docker exec $name pg_isready -U feature_qa -d feature_qa *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw 'Isolated PostgreSQL did not become ready.' }
    $binding = docker port $name 5432/tcp
    if ($binding -notmatch '^127\.0\.0\.1:(\d+)$') { throw 'Unexpected port binding; refusing QA.' }
    $env:FEATURE_QA_DATABASE = "jdbc:postgresql://127.0.0.1:$($Matches[1])/feature_qa"
    Set-Location (Join-Path $root 'backend')
    & mvn -B -o '-Dtest=FeaturePersistenceIntegrationTest' test
    if ($LASTEXITCODE -ne 0) { throw 'Feature persistence integration failed. See Surefire report.' }
    Write-Output 'FEATURE_PERSISTENCE_QA=PASS (disposable PostgreSQL, full HTTP, restart)'
} finally {
    $env:FEATURE_QA_DATABASE = $previousDatabase
    if ($started) {
        # Only this invocation's random container, --rm removes its tmpfs database on stop.
        docker stop $name | Out-Null
        if ($LASTEXITCODE -ne 0) { Write-Warning "QA container cleanup failed: $name" }
    }
    Pop-Location
}