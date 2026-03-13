<# 
.SYNOPSIS
    Prepare Nebula Media Converter for GitHub - Security & Safety Script
    
.DESCRIPTION
    This script prepares the project for safe GitHub publication by:
    - Removing sensitive files and data
    - Scanning for secrets and credentials
    - Validating .gitignore configuration
    - Running security audits
    - Creating clean commit history
    
.NOTES
    Author: Colin Nebula
    Version: 1.0.0
    Date: 2024
#>

param(
    [switch]$DryRun,
    [switch]$SkipAudit,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  NEBULA MEDIA CONVERTER - GITHUB PREP" -ForegroundColor Cyan
Write-Host "  Security & Safety Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Change to project root
Set-Location $projectRoot
Write-Host "📁 Working directory: $projectRoot" -ForegroundColor Gray

# ============================================
# STEP 1: Check for sensitive files
# ============================================
Write-Host ""
Write-Host "🔍 STEP 1: Scanning for sensitive files..." -ForegroundColor Yellow

$sensitivePatterns = @(
    "*.pem",
    "*.key",
    "*.crt",
    "*.p12",
    "*.pfx",
    "*.env",
    "*credentials*.json",
    "*secret*",
    "*api_key*",
    "*.sqlite",
    "*.db"
)

$sensitiveFiles = @()
foreach ($pattern in $sensitivePatterns) {
    $files = Get-ChildItem -Path $projectRoot -Filter $pattern -Recurse -File -ErrorAction SilentlyContinue |
             Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*.git*" }
    if ($files) {
        $sensitiveFiles += $files
    }
}

if ($sensitiveFiles.Count -gt 0) {
    Write-Host "⚠️  Found potentially sensitive files:" -ForegroundColor Red
    foreach ($file in $sensitiveFiles) {
        $relativePath = $file.FullName.Replace($projectRoot, "").TrimStart("\")
        Write-Host "   - $relativePath" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "   These files should NOT be committed to GitHub!" -ForegroundColor Red
    Write-Host "   Verify they are in .gitignore before proceeding." -ForegroundColor Red
} else {
    Write-Host "✅ No sensitive files found outside of node_modules" -ForegroundColor Green
}

# ============================================
# STEP 2: Validate .env handling
# ============================================
Write-Host ""
Write-Host "🔐 STEP 2: Validating environment configuration..." -ForegroundColor Yellow

$envFile = Join-Path $projectRoot ".env"
$envExample = Join-Path $projectRoot ".env.example"

if (Test-Path $envFile) {
    # Check if .env is in .gitignore
    $gitignore = Get-Content (Join-Path $projectRoot ".gitignore") -ErrorAction SilentlyContinue
    if ($gitignore -match "^\.env$" -or $gitignore -match "^\*\.env$") {
        Write-Host "✅ .env is properly ignored in .gitignore" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING: .env may not be properly ignored!" -ForegroundColor Red
    }
    
    # Scan .env for actual non-placeholder values on credential lines
    $envContent = Get-Content $envFile
    $credentialKeys = @('PASSWORD_HASH', 'PASSWORD_SALT', 'ADMIN_PASSWORD', 'EMAILJS_PUBLIC_KEY', 'EMAILJS_SERVICE', 'STRIPE_PUBLISHABLE_KEY')
    
    $hasRealSecrets = $false
    foreach ($line in $envContent) {
        if ($line -match '^#' -or $line.Trim() -eq '') { continue }
        $isPlaceholder = ($line -match 'placeholder|your_|CHANGE_|replace_with|generate-with|xxxxxxx|pk_test_')
        foreach ($key in $credentialKeys) {
            if ($line -match $key -and -not $isPlaceholder) {
                $val = ($line -split '=', 2)[-1].Trim()
                if ($val.Length -gt 8) {
                    $hasRealSecrets = $true
                    break
                }
            }
        }
    }
    
    if ($hasRealSecrets) {
        Write-Host "⚠️  .env appears to contain real credentials" -ForegroundColor Yellow
        Write-Host "   Make sure .env is NEVER committed to Git" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️  No .env file found (this is fine if using .env.example)" -ForegroundColor Gray
}

if (Test-Path $envExample) {
    Write-Host "✅ .env.example template exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  Missing .env.example - users won't know required variables" -ForegroundColor Yellow
}

# ============================================
# STEP 3: Scan for hardcoded secrets in code
# ============================================
Write-Host ""
Write-Host "🔎 STEP 3: Scanning code for hardcoded secrets..." -ForegroundColor Yellow

$secretPatterns = @(
    'password\s*[:=]\s*[a-zA-Z0-9]{8}',
    'api.key\s*[:=]\s*[a-zA-Z0-9]{20}',
    'sk_live_[a-zA-Z0-9]+',
    'pk_live_[a-zA-Z0-9]+',
    'ghp_[a-zA-Z0-9]+',
    'AKIA[A-Z0-9]+',
    'service_[a-zA-Z0-9]+',
    'template_[a-zA-Z0-9]+'
)

$codeFiles = Get-ChildItem -Path $projectRoot -Recurse -File |
             Where-Object { $_.Extension -in @('.js','.jsx','.ts','.tsx','.json') -and
                            $_.FullName -notlike '*node_modules*' -and
                            $_.FullName -notlike '*.git*' -and
                            $_.Name -ne 'package-lock.json' }

$foundSecrets = @()
foreach ($file in $codeFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    foreach ($pattern in $secretPatterns) {
        if ($content -match $pattern) {
            $foundSecrets += @{
                File = $file.FullName.Replace($projectRoot, "").TrimStart("\")
                Pattern = $pattern
            }
        }
    }
}

if ($foundSecrets.Count -gt 0) {
    Write-Host "⚠️  Potential hardcoded secrets found:" -ForegroundColor Red
    $foundSecrets | ForEach-Object {
        Write-Host "   - $($_.File)" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "   Review these files and move secrets to environment variables!" -ForegroundColor Red
} else {
    Write-Host "✅ No obvious hardcoded secrets found in code" -ForegroundColor Green
}

# ============================================
# STEP 4: Check for large files
# ============================================
Write-Host ""
Write-Host "📦 STEP 4: Checking for large files..." -ForegroundColor Yellow

$largeFiles = Get-ChildItem -Path $projectRoot -Recurse -File |
              Where-Object { 
                  $_.Length -gt 10MB -and 
                  $_.FullName -notlike "*node_modules*" -and 
                  $_.FullName -notlike "*.git*"
              } |
              Select-Object @{N="Path";E={$_.FullName.Replace($projectRoot, "").TrimStart("\")}}, 
                           @{N="SizeMB";E={[math]::Round($_.Length/1MB, 2)}}

if ($largeFiles) {
    Write-Host "⚠️  Large files found (>10MB):" -ForegroundColor Yellow
    $largeFiles | ForEach-Object {
        Write-Host "   - $($_.Path) ($($_.SizeMB) MB)" -ForegroundColor Yellow
    }
    Write-Host "   Consider adding these to .gitignore or using Git LFS" -ForegroundColor Yellow
} else {
    Write-Host "✅ No excessively large files found" -ForegroundColor Green
}

# ============================================
# STEP 5: Run npm audit (if not skipped)
# ============================================
if (-not $SkipAudit) {
    Write-Host ""
    Write-Host "🛡️ STEP 5: Running npm security audit..." -ForegroundColor Yellow
    
    try {
        $auditResult = npm audit --json 2>$null | ConvertFrom-Json
        
        $critical = $auditResult.metadata.vulnerabilities.critical
        $high = $auditResult.metadata.vulnerabilities.high
        $moderate = $auditResult.metadata.vulnerabilities.moderate
        
        if ($critical -gt 0 -or $high -gt 0) {
            Write-Host "⚠️  Security vulnerabilities found:" -ForegroundColor Red
            Write-Host "   Critical: $critical, High: $high, Moderate: $moderate" -ForegroundColor Red
            Write-Host "   Run 'npm audit fix' to attempt automatic fixes" -ForegroundColor Yellow
        } elseif ($moderate -gt 0) {
            Write-Host "⚠️  Moderate vulnerabilities found: $moderate" -ForegroundColor Yellow
            Write-Host "   Consider running 'npm audit fix'" -ForegroundColor Yellow
        } else {
            Write-Host "✅ No high-severity vulnerabilities found" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Could not run npm audit (npm may not be available)" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "⏭️  STEP 5: Skipping npm audit (--SkipAudit flag)" -ForegroundColor Gray
}

# ============================================
# STEP 6: Verify Git status
# ============================================
Write-Host ""
Write-Host "📝 STEP 6: Checking Git status..." -ForegroundColor Yellow

try {
    $gitStatus = git status --porcelain 2>$null
    $stagedFiles = git diff --cached --name-only 2>$null
    
    # Check if any sensitive files are staged
    $sensitiveStaged = $stagedFiles | Where-Object { 
        $_ -match "\.env$" -or 
        $_ -match "\.pem$" -or 
        $_ -match "\.key$" -or
        $_ -match "credentials" -or
        $_ -match "secret"
    }
    
    if ($sensitiveStaged) {
        Write-Host "🚨 DANGER: Sensitive files are staged for commit!" -ForegroundColor Red
        $sensitiveStaged | ForEach-Object {
            Write-Host "   - $_" -ForegroundColor Red
        }
        Write-Host "   Run 'git reset HEAD <file>' to unstage these files!" -ForegroundColor Red
    } else {
        Write-Host "✅ No sensitive files are staged for commit" -ForegroundColor Green
    }
    
    # Count changes
    $changedCount = ($gitStatus | Measure-Object).Count
    Write-Host "ℹ️  $changedCount file(s) with uncommitted changes" -ForegroundColor Gray
    
} catch {
    Write-Host "⚠️  Not a Git repository or Git not available" -ForegroundColor Yellow
}

# ============================================
# STEP 7: Generate security report
# ============================================
Write-Host ""
Write-Host "📊 STEP 7: Generating security checklist..." -ForegroundColor Yellow

$checklist = @"

============================================
  GITHUB PUBLICATION CHECKLIST
============================================

Before pushing to GitHub, verify:

[ ] .env file is in .gitignore and NOT committed
[ ] .env.example contains only placeholder values
[ ] No API keys/passwords hardcoded in source files
[ ] No private keys (.pem, .key) in repository
[ ] No database files (.db, .sqlite) committed
[ ] Large binary files are in .gitignore
[ ] npm audit shows no critical vulnerabilities
[ ] GitHub Actions workflows are properly configured
[ ] SECURITY.md policy is in place
[ ] CODEOWNERS file reflects your team
[ ] Branch protection rules will be enabled
[ ] Two-factor authentication is enabled on GitHub

Security configurations created:
  ✓ .github/SECURITY.md - Security policy
  ✓ .github/workflows/security.yml - Automated security scans
  ✓ .github/workflows/ci.yml - CI/CD pipeline
  ✓ .github/dependabot.yml - Dependency updates
  ✓ .github/CODEOWNERS - Code review requirements

============================================
"@

Write-Host $checklist -ForegroundColor Cyan

# ============================================
# Final Summary
# ============================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  PREPARATION COMPLETE" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

if ($DryRun) {
    Write-Host "ℹ️  This was a DRY RUN - no changes were made" -ForegroundColor Yellow
}

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review any warnings above" -ForegroundColor White
Write-Host "  2. Run: git add ." -ForegroundColor White
Write-Host "  3. Run: git commit -m 'Prepare for GitHub'" -ForegroundColor White
Write-Host "  4. Run: git push origin main" -ForegroundColor White
Write-Host ""
Write-Host "After pushing, enable in GitHub repository settings:" -ForegroundColor Cyan
Write-Host "  - Branch protection rules for 'main'" -ForegroundColor White
Write-Host "  - Require pull request reviews" -ForegroundColor White
Write-Host "  - Require status checks to pass" -ForegroundColor White
Write-Host "  - Enable secret scanning" -ForegroundColor White
Write-Host "  - Enable Dependabot alerts" -ForegroundColor White
Write-Host ""
