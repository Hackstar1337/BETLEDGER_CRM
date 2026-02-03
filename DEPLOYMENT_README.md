# Khiladi247 Management Panel - Deployment Guide

## 🚀 Quick Deploy

This package is fully auto-deployable on any hosting platform with Node.js and MySQL support.

### Prerequisites

1. **MySQL Database** (version 5.7+ or MariaDB 10.3+)
2. **Node.js** (version 18+ recommended)
3. **pnpm** package manager

---

## 📦 One-Click Deployment Platforms

### Railway

1. Create new project on [Railway.app](https://railway.app)
2. Add MySQL database service
3. Upload this ZIP file or connect to Git repository
4. Set environment variables:
   - `DATABASE_URL` - Provided by Railway MySQL service
   - `JWT_SECRET` - Will be auto-generated if not provided
5. Deploy! Admin credentials will be shown in deployment logs

### Render

1. Create new Web Service on [Render.com](https://render.com)
2. Upload this ZIP or connect to Git repository
3. Render will use `render.yaml` configuration automatically
4. Add MySQL database (external or Render PostgreSQL with adapter)
5. Set `DATABASE_URL` environment variable
6. Deploy! Check logs for admin credentials

---

## 🖥️ Manual VPS Deployment

### Step 1: Upload Files

```bash
# Upload ZIP to your VPS
scp khiladi247-deployment.zip user@your-vps-ip:/home/user/

# SSH into VPS
ssh user@your-vps-ip

# Extract files
unzip khiladi247-deployment.zip
cd khiladi247-management-panel
```

### Step 2: Install Dependencies

```bash
# Install Node.js 18+ (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install project dependencies
pnpm install --prod
```

### Step 3: Setup MySQL Database

```bash
# Install MySQL (if not already installed)
sudo apt-get install mysql-server

# Create database
sudo mysql -e "CREATE DATABASE khiladi247 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'khiladi247'@'localhost' IDENTIFIED BY 'your-secure-password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON khiladi247.* TO 'khiladi247'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
```

### Step 4: Configure Environment

```bash
# Create .env file
cat > .env << EOF
DATABASE_URL="mysql://khiladi247:your-secure-password@localhost:3306/khiladi247"
JWT_SECRET="$(openssl rand -base64 32)"
NODE_ENV=production
PORT=3000
EOF
```

### Step 5: Run Automated Setup

```bash
# Make startup script executable
chmod +x scripts/startup.sh

# Run setup (creates tables and admin user)
bash scripts/startup.sh
```

**IMPORTANT:** Save the admin credentials displayed in the terminal!

### Step 6: Setup PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Step 7: Setup Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt-get install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/khiladi247
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/khiladi247 /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 8: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is setup automatically
```

---

## 🔧 Environment Variables

### Required

| Variable       | Description             | Example                          |
| -------------- | ----------------------- | -------------------------------- |
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/db` |
| `JWT_SECRET`   | Secret for JWT tokens   | `your-random-secret-key`         |

### Optional

| Variable   | Description      | Default      |
| ---------- | ---------------- | ------------ |
| `NODE_ENV` | Environment mode | `production` |
| `PORT`     | Server port      | `3000`       |

---

## 📋 Post-Deployment Checklist

- [ ] Application is accessible via browser
- [ ] Admin login works with generated credentials
- [ ] Database tables are created automatically
- [ ] Change admin password via Settings
- [ ] Delete `ADMIN_CREDENTIALS.txt` after saving password
- [ ] Setup database backups
- [ ] Configure firewall rules
- [ ] Setup monitoring/logging
- [ ] Test all features (panels, players, transactions)

---

## 🔐 Security Recommendations

1. **Change Default Password** - Immediately after first login
2. **Use Strong JWT Secret** - Generate with `openssl rand -base64 32`
3. **Enable HTTPS** - Use Let's Encrypt or Cloudflare
4. **Restrict Database Access** - Only allow localhost or specific IPs
5. **Setup Firewall** - Only allow ports 80, 443, and SSH
6. **Regular Backups** - Automate daily database backups
7. **Keep Updated** - Regularly update dependencies with `pnpm update`
8. **Monitor Logs** - Check PM2 logs regularly with `pm2 logs`

---

## 🐛 Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs

# Check if port is available
sudo netstat -tulpn | grep 3000

# Check database connection
mysql -h host -u user -p database
```

### Database Connection Error

- Verify `DATABASE_URL` is correct
- Ensure MySQL is running: `sudo systemctl status mysql`
- Check firewall allows MySQL port (3306)
- Test connection: `mysql -h host -u user -p`

### Admin Login Not Working

```bash
# Recreate admin user
node scripts/ensure-admin.mjs
```

### Port Already in Use

Change PORT in `.env` file:

```bash
PORT=8080
```

---

## 📞 Support

For issues or questions:

1. Check logs: `pm2 logs` or `tail -f logs/app.log`
2. Review deployment documentation
3. Verify all environment variables are set correctly

---

## 📝 File Structure

```
khiladi247-management-panel/
├── client/                 # Frontend React application
├── server/                 # Backend Express + tRPC
├── drizzle/               # Database schema
├── scripts/               # Deployment scripts
│   ├── startup.sh         # Automated setup script
│   └── ensure-admin.mjs   # Admin user creation
├── ecosystem.config.js    # PM2 configuration
├── railway.json           # Railway deployment config
├── render.yaml            # Render deployment config
├── package.json           # Dependencies
└── DEPLOYMENT_README.md   # This file
```

---

## 🎉 Success!

Your Khiladi247 Management Panel is now deployed and ready to use!

Access your panel at: `http://your-domain.com` or `http://your-vps-ip:3000`

Login with the admin credentials from `ADMIN_CREDENTIALS.txt`
