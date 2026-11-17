$ErrorActionPreference = "Stop"

Push-Location (Join-Path $PSScriptRoot "..\..\apps\api")

Write-Host "[db] Prisma generate"
npm run prisma:generate

Write-Host "[db] Prisma migrate deploy"
npm run prisma:migrate:deploy

Pop-Location
Write-Host "[db] Done"
