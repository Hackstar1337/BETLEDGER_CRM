# PowerShell script to apply bank account validation
# Make sure you have MySQL command line tools installed

# Get database credentials from .env file
$envContent = Get-Content ".env" | Where-Object { $_ -match "^DATABASE_URL=" }
if ($envContent) {
    $dbUrl = $envContent -replace "^DATABASE_URL=", ""
    # Parse mysql://user:password@host:port/database
    if ($dbUrl -match "mysql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)") {
        $user = $matches[1]
        $password = $matches[2]
        $host = $matches[3]
        $port = $matches[4]
        $database = $matches[5]
        
        Write-Host "Connecting to database: $database on $host:$port" -ForegroundColor Green
        
        # Run the SQL script
        $sqlScript = Get-Content "setup-bank-validation.sql" -Raw
        
        # Execute MySQL command
        $mysqlCmd = "mysql -h$host -P$port -u$user -p$password $database"
        
        Write-Host "Executing SQL script..." -ForegroundColor Yellow
        $sqlScript | & $mysqlCmd
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database setup completed successfully!" -ForegroundColor Green
        } else {
            Write-Host "❌ Error executing SQL script" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Could not parse DATABASE_URL" -ForegroundColor Red
    }
} else {
    Write-Host "❌ DATABASE_URL not found in .env file" -ForegroundColor Red
    Write-Host "Please run the setup-bank-validation.sql manually in your MySQL client" -ForegroundColor Yellow
}
