#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Khiladi247 Localhost Deployment Script
.DESCRIPTION
    Automated deployment script for Khiladi247 Management Panel on localhost
    Includes database setup, admin user creation, and application startup
.PARAMETER SkipDatabase
    Skip database setup if already configured
.PARAMETER SkipInstall
    Skip npm install if dependencies already installed
.EXAMPLE
    .\deploy-localhost.ps1
    Full deployment with database setup
.EXAMPLE
    .\deploy-localhost.ps1 -SkipDatabase
    Deploy without database setup (for restarts)
#>

param(
    [switch]$SkipDatabase,
    [switch]$SkipInstall
)

# Color codes for output
$Colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
    Header = "Magenta"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Test-MySQLConnection {
    param(
        [string]$User = "khiladi247",
        [string]$Password = "khiladi247123",
        [string]$Database = "khiladi247"
    )
    
    try {
        $result = mysql -u $User -p$Password $Database -e "SELECT 'Connection OK' as status;" 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

function Setup-Database {
    Write-ColorOutput "`n=== DATABASE SETUP ===" "Header"
    
    # Test MySQL availability
    if (-not (Test-Command "mysql")) {
        Write-ColorOutput "❌ MySQL is not installed or not in PATH" "Error"
        Write-ColorOutput "Please install MySQL and add it to PATH" "Warning"
        return $false
    }
    
    Write-ColorOutput "✅ MySQL command found" "Success"
    
    # Check if MySQL service is running
    $mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue | Where-Object {$_.Status -eq "Running"}
    if (-not $mysqlService) {
        Write-ColorOutput "❌ MySQL service is not running" "Error"
        Write-ColorOutput "Please start MySQL service" "Warning"
        return $false
    }
    
    Write-ColorOutput "✅ MySQL service is running" "Success"
    
    # Create database and user
    Write-ColorOutput "`n📝 Creating database and user..." "Info"
    
    try {
        # Create database and user (requires root access)
        Write-ColorOutput "Please enter MySQL root password when prompted..." "Warning"
        
        $sqlCommands = @"
CREATE DATABASE IF NOT EXISTS khiladi247 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'khiladi247'@'localhost' IDENTIFIED BY 'khiladi247123';
GRANT ALL PRIVILEGES ON khiladi247.* TO 'khiladi247'@'localhost';
FLUSH PRIVILEGES;
"@
        
        $sqlCommands | mysql -u root -p
        
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "❌ Failed to create database/user" "Error"
            return $false
        }
        
        Write-ColorOutput "✅ Database and user created successfully" "Success"
        
        # Test connection with new user
        if (Test-MySQLConnection) {
            Write-ColorOutput "✅ Database connection test passed" "Success"
        } else {
            Write-ColorOutput "❌ Database connection test failed" "Error"
            return $false
        }
        
        # Create admin user
        Write-ColorOutput "`n👤 Creating admin user..." "Info"
        
        if (Test-Path "scripts\admin-setup.sql") {
            Get-Content "scripts\admin-setup.sql" | mysql -u khiladi247 -p'khiladi247123' khiladi247
            
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "✅ Admin user created successfully" "Success"
            } else {
                Write-ColorOutput "⚠️ Admin user might already exist or creation failed" "Warning"
            }
        } else {
            Write-ColorOutput "❌ Admin setup script not found" "Error"
            return $false
        }
        
        return $true
    }
    catch {
        Write-ColorOutput "❌ Database setup failed: $($_.Exception.Message)" "Error"
        return $false
    }
}

function Set-Environment {
    Write-ColorOutput "`n=== ENVIRONMENT CONFIGURATION ===" "Header"
    
    $envFile = ".env"
    $envContent = @"
# Database Configuration
DATABASE_URL=mysql://khiladi247:khiladi247123@localhost:3306/khiladi247

# JWT Secret (generate a random secure string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
NODE_ENV=development
PORT=3000
"@
    
    try {
        if (Test-Path $envFile) {
            Write-ColorOutput "⚠️ .env file already exists" "Warning"
            $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
            if ($overwrite -ne "y" -and $overwrite -ne "Y") {
                Write-ColorOutput "Keeping existing .env file" "Info"
                return $true
            }
        }
        
        Set-Content -Path $envFile -Value $envContent -NoNewline
        Write-ColorOutput "✅ Environment configuration created" "Success"
        return $true
    }
    catch {
        Write-ColorOutput "❌ Failed to create environment file: $($_.Exception.Message)" "Error"
        return $false
    }
}

function Install-Dependencies {
    Write-ColorOutput "`n=== DEPENDENCY INSTALLATION ===" "Header"
    
    if (-not (Test-Command "npm")) {
        Write-ColorOutput "❌ npm is not installed or not in PATH" "Error"
        return $false
    }
    
    Write-ColorOutput "📦 Installing dependencies..." "Info"
    
    try {
        npm install
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Dependencies installed successfully" "Success"
            return $true
        } else {
            Write-ColorOutput "❌ Dependency installation failed" "Error"
            return $false
        }
    }
    catch {
        Write-ColorOutput "❌ Dependency installation failed: $($_.Exception.Message)" "Error"
        return $false
    }
}

function Start-Application {
    Write-ColorOutput "`n=== APPLICATION STARTUP ===" "Header"
    
    Write-ColorOutput "🚀 Starting application..." "Info"
    Write-ColorOutput "Application will be available at: http://localhost:3000" "Info"
    Write-ColorOutput "Press Ctrl+C to stop the server" "Warning"
    
    try {
        $env:DATABASE_URL = "mysql://khiladi247:khiladi247123@localhost:3306/khiladi247"
        npm run dev
    }
    catch {
        Write-ColorOutput "❌ Application startup failed: $($_.Exception.Message)" "Error"
        return $false
    }
}

function Show-Credentials {
    Write-ColorOutput "`n=== ADMIN CREDENTIALS ===" "Header"
    Write-ColorOutput "🔑 Username: admin" "Info"
    Write-ColorOutput "🔑 Password: UXgCTqyrrEQbYDvQ" "Info"
    Write-ColorOutput "📧 Email: admin@khiladi247.com" "Info"
    Write-ColorOutput "⚠️ Please change the password after first login!" "Warning"
}

function Main {
    Clear-Host
    Write-ColorOutput "========================================" "Header"
    Write-ColorOutput "  KHILADI247 LOCALHOST DEPLOYMENT" "Header"
    Write-ColorOutput "========================================" "Header"
    
    $startLocation = Get-Location
    
    try {
        # Check if we're in the right directory
        if (-not (Test-Path "package.json")) {
            Write-ColorOutput "❌ package.json not found. Please run this script from the project root." "Error"
            exit 1
        }
        
        # Step 1: Database Setup
        if (-not $SkipDatabase) {
            if (-not (Setup-Database)) {
                Write-ColorOutput "`n❌ Database setup failed. Deployment aborted." "Error"
                exit 1
            }
        } else {
            Write-ColorOutput "`n⏭️ Skipping database setup..." "Warning"
            if (-not (Test-MySQLConnection)) {
                Write-ColorOutput "❌ Database connection test failed" "Error"
                Write-ColorOutput "Cannot skip database setup when connection fails" "Error"
                exit 1
            }
            Write-ColorOutput "✅ Database connection verified" "Success"
        }
        
        # Step 2: Environment Configuration
        if (-not (Set-Environment)) {
            Write-ColorOutput "`n❌ Environment setup failed. Deployment aborted." "Error"
            exit 1
        }
        
        # Step 3: Dependency Installation
        if (-not $SkipInstall) {
            if (-not (Install-Dependencies)) {
                Write-ColorOutput "`n❌ Dependency installation failed. Deployment aborted." "Error"
                exit 1
            }
        } else {
            Write-ColorOutput "`n⏭️ Skipping dependency installation..." "Warning"
        }
        
        # Step 4: Show Credentials
        Show-Credentials
        
        # Step 5: Start Application
        Start-Application
        
    }
    catch {
        Write-ColorOutput "`n💥 Deployment failed: $($_.Exception.Message)" "Error"
        exit 1
    }
    finally {
        Set-Location $startLocation
    }
}

# Run the main function
Main
