# Start all services for HCM Chatbot on Windows (PowerShell)
# - .NET API on port 9000
# - Python FastAPI on port 8000
# - Frontend static server on port 3000
# Logs and PID files are under ./logs

$ErrorActionPreference = 'Stop'

# Thiết lập UTF-8 để tránh lỗi phông chữ tiếng Việt trong console
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

function Test-PortFree {
    param([int]$Port)
    try {
        $conn = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop
        return $false
    } catch {
        return $true
    }
}

function Start-ServiceProc {
    param(
        [string]$Name,
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory,
        [int]$Port,
        [string]$LogFile
    )

    if (-not (Test-PortFree -Port $Port)) {
        Write-Host "Port $Port đang bận, không thể khởi động $Name"
        return $false
    }

    if (-not (Test-Path $global:LogsDir)) {
        New-Item -ItemType Directory -Path $global:LogsDir -Force | Out-Null
    }

    $stdout = Join-Path $global:LogsDir $LogFile
    # stderr khác file với stdout
    if ($stdout -match '\.log$') {
        $stderr = ($stdout -replace '\.log$', '.err.log')
    } else {
        $stderr = "$stdout.err"
    }

    # Dùng cmd.exe để redirect 1> stdout và 2> stderr, tránh xung đột RedirectStandard*
    $p = Start-Process -FilePath $FilePath -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory `
        -NoNewWindow -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr

    $pidPath = Join-Path $global:LogsDir ("{0}.pid" -f ($Name.ToLower()))
    Set-Content -Path $pidPath -Value $p.Id

    Write-Host "$Name started (PID $($p.Id))"
    return $true
}

function Wait-ForUrl {
    param(
        [string]$Name,
        [string]$Url,
        [int]$MaxAttempts = 30,
        [int]$DelaySeconds = 2
    )

    Write-Host "Chờ $Name sẵn sàng..."
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        try {
            $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            Write-Host "$Name sẵn sàng"
            return $true
        } catch {
            Start-Sleep -Seconds $DelaySeconds
        }
    }

    Write-Host "$Name không sẵn sàng trong thời gian chờ"
    return $false
}

$Root = $PSScriptRoot
$LogsDir = Join-Path $Root 'logs'
$global:LogsDir = $LogsDir

$DotnetPort = 9000
$PythonPort = 8000
$FrontendPort = 3000

# Prerequisites checks
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Error ".NET SDK chưa cài đặt. Vui lòng cài .NET 8 trở lên."
    exit 1
}

$backendDir = Join-Path $Root 'backend'
$pythonVenv = Join-Path $backendDir 'venv\Scripts\python.exe'
if (Test-Path $pythonVenv) {
    $pythonCmd = $pythonVenv
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $pythonCmd = 'py'
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = 'python'
} else {
    Write-Error "Python chưa cài đặt. Vui lòng cài Python 3.10+"
    exit 1
}

# PostgreSQL check (optional)
try {
    $pg = Test-NetConnection -ComputerName localhost -Port 5432
    if (-not $pg.TcpTestSucceeded) {
        Write-Host "Cảnh báo: PostgreSQL chưa chạy trên 5432. .NET API vẫn khởi động được nhưng tính năng DB sẽ không hoạt động."
    }
} catch {}

# GEMINI_API_KEY check (optional but recommended)
$envFile = Join-Path $backendDir '.env'
if (-not (Test-Path $envFile)) {
    Write-Host "Cảnh báo: thiếu backend\\.env (GEMINI_API_KEY). Backend Python có thể không khởi động."
} else {
    $hasKey = Select-String -Path $envFile -Pattern '^GEMINI_API_KEY=' -Quiet
    if (-not $hasKey) {
        Write-Host "Cảnh báo: backend\\.env thiếu GEMINI_API_KEY."
    }
}

# 1) Start .NET API
$dotnetDir = Join-Path $Root 'dotnet-api\hcm-chatbot-api'
$dnArgs = @('run','--project','Web_API/Web_API.csproj','--urls',"http://localhost:$DotnetPort")
$ok = Start-ServiceProc -Name 'NET_API' -FilePath 'dotnet' -Arguments $dnArgs -WorkingDirectory $dotnetDir -Port $DotnetPort -LogFile 'dotnet-api.log'
if ($ok) { [void](Wait-ForUrl -Name '.NET API' -Url "http://localhost:$DotnetPort/health") }

# 2) Start Python AI Backend
$pyArgs = @('-m','uvicorn','app.main:app','--host','0.0.0.0','--port',"$PythonPort")
$ok = Start-ServiceProc -Name 'PYTHON_AI' -FilePath $pythonCmd -Arguments $pyArgs -WorkingDirectory $backendDir -Port $PythonPort -LogFile 'python-ai.log'
if ($ok) { [void](Wait-ForUrl -Name 'Python AI' -Url "http://localhost:$PythonPort/health" -MaxAttempts 120 -DelaySeconds 2) }

# 3) Start Frontend static server
$frontendDir = Join-Path $Root 'frontend'
$feArgs = @('-m','http.server',"$FrontendPort")
$ok = Start-ServiceProc -Name 'FRONTEND' -FilePath $pythonCmd -Arguments $feArgs -WorkingDirectory $frontendDir -Port $FrontendPort -LogFile 'frontend.log'
if ($ok) { [void](Wait-ForUrl -Name 'Frontend' -Url "http://localhost:$FrontendPort") }

Write-Host ""
Write-Host "Service URLs:"
Write-Host "Frontend:    http://localhost:$FrontendPort/index.html"
Write-Host ".NET API:    http://localhost:$DotnetPort/swagger"
Write-Host "Python API:  http://localhost:$PythonPort/docs"

Write-Host ""
Write-Host "Admin mặc định (nếu DB rỗng):"
Write-Host "Username: admin"
Write-Host "Password: admin123"

Write-Host ""
Write-Host "Logs: .\\logs\\*.log"
