@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   KHILADI247 LOCALHOST DEPLOYMENT
echo ========================================
echo.

REM Check if package.json exists
if not exist "package.json" (
    echo ERROR: package.json not found. Please run this from the project root.
    pause
    exit /b 1
)

REM Check if MySQL is available
mysql --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: MySQL is not installed or not in PATH.
    echo Please install MySQL and add it to your system PATH.
    pause
    exit /b 1
)

echo ✅ MySQL command found
echo.

REM Check if MySQL service is running
sc query MySQL80 >nul 2>&1
if errorlevel 1 (
    echo WARNING: MySQL service might not be running.
    echo Please ensure MySQL service is started.
    echo.
)

REM Database Setup
echo === DATABASE SETUP ===
echo 📝 Creating database and user...
echo Please enter MySQL root password when prompted...
echo.

REM Create database and user
(
echo CREATE DATABASE IF NOT EXISTS khiladi247 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
echo CREATE USER IF NOT EXISTS 'khiladi247'@'localhost' IDENTIFIED BY 'khiladi247123';
echo GRANT ALL PRIVILEGES ON khiladi247.* TO 'khiladi247'@'localhost';
echo FLUSH PRIVILEGES;
) | mysql -u root -p

if errorlevel 1 (
    echo ❌ Database setup failed.
    pause
    exit /b 1
)

echo ✅ Database and user created successfully
echo.

REM Test database connection
echo 🔍 Testing database connection...
mysql -u khiladi247 -p'khiladi247123' khiladi247 -e "SELECT 'Connection OK' as status;" >nul 2>&1
if errorlevel 1 (
    echo ❌ Database connection test failed.
    pause
    exit /b 1
)

echo ✅ Database connection test passed
echo.

REM Create admin user
echo 👤 Creating admin user...
if exist "scripts\admin-setup.sql" (
    type "scripts\admin-setup.sql" | mysql -u khiladi247 -p'khiladi247123' khiladi247
    if not errorlevel 1 (
        echo ✅ Admin user created successfully
    ) else (
        echo ⚠️ Admin user might already exist or creation failed
    )
) else (
    echo ❌ Admin setup script not found
    pause
    exit /b 1
)

echo.

REM Environment Configuration
echo === ENVIRONMENT CONFIGURATION ===
echo 📝 Creating .env file...

(
echo # Database Configuration
echo DATABASE_URL=mysql://khiladi247:khiladi247123@localhost:3306/khiladi247
echo.
echo # JWT Secret ^(generate a random secure string^)
echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
echo.
echo # Server Configuration
echo NODE_ENV=development
echo PORT=3000
) > .env

echo ✅ Environment configuration created
echo.

REM Install Dependencies
echo === DEPENDENCY INSTALLATION ===
echo 📦 Installing dependencies...

npm install
if errorlevel 1 (
    echo ❌ Dependency installation failed.
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully
echo.

REM Show Credentials
echo === ADMIN CREDENTIALS ===
echo 🔑 Username: admin
echo 🔑 Password: UXgCTqyrrEQbYDvQ
echo 📧 Email: admin@khiladi247.com
echo ⚠️ Please change the password after first login!
echo.

REM Start Application
echo === APPLICATION STARTUP ===
echo 🚀 Starting application...
echo Application will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

set DATABASE_URL=mysql://khiladi247:khiladi247123@localhost:3306/khiladi247
npm run dev

pause
