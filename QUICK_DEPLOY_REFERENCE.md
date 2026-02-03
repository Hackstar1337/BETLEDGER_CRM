# Khiladi247 Quick Deploy Reference

## One-Command Deployment

### PowerShell (Recommended)

```powershell
.\deploy-localhost.ps1
```

### Command Prompt

```cmd
deploy-localhost.bat
```

## Manual Commands

### 1. Database Setup

```sql
-- In MySQL (as root):
CREATE DATABASE IF NOT EXISTS khiladi247 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'khiladi247'@'localhost' IDENTIFIED BY 'khiladi247123';
GRANT ALL PRIVILEGES ON khiladi247.* TO 'khiladi247'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Admin User

```powershell
Get-Content "scripts\admin-setup.sql" | mysql -u khiladi247 -p'khiladi247123' khiladi247
```

### 3. Environment File (.env)

```env
DATABASE_URL=mysql://khiladi247:khiladi247123@localhost:3306/khiladi247
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
PORT=3000
```

### 4. Install & Start

```powershell
npm install
npm run dev
```

## Access

- **URL:** http://localhost:3000
- **Username:** admin
- **Password:** UXgCTqyrrEQbYDvQ

## Troubleshooting

```powershell
# Test DB connection
mysql -u khiladi247 -p'khiladi247123' khiladi247 -e "SELECT 'OK';"

# Kill port 3000 processes
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force

# Check port 3000
netstat -an | findstr :3000
```

## Files Created

- `LOCALHOST_DEPLOYMENT_GUIDE.md` - Comprehensive guide
- `deploy-localhost.ps1` - PowerShell automation script
- `deploy-localhost.bat` - Batch file for CMD
- `QUICK_DEPLOY_REFERENCE.md` - This file
