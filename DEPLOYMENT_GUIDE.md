# Khiladi247 Management Panel - Deployment Guide

## Standalone Deployment (VPS/Hosting)

This application now uses **standalone authentication** and can be deployed on any VPS or hosting provider without external dependencies.

---

## Prerequisites

- Node.js 18+ installed
- MySQL/TiDB database
- Domain name (optional but recommended)

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
DATABASE_URL=mysql://username:password@host:port/database_name

# JWT Secret (generate a random secure string)
JWT_SECRET=your-super-secret-jwt-key-change-this

# Server Configuration
NODE_ENV=production
PORT=3000
```

---

## Installation Steps

### 1. Clone/Upload Project Files

Upload all project files to your VPS or hosting server.

### 2. Install Dependencies

```bash
cd /path/to/khiladi_management_panel
pnpm install
```

### 3. Configure Database

Update the `DATABASE_URL` in `.env` with your database credentials.

### 4. Push Database Schema

```bash
pnpm db:push
```

This will create all necessary tables in your database.

### 5. Initialize Admin User

```bash
node --import tsx server/init-admin.mjs
```

**IMPORTANT:** Save the generated admin credentials securely! They will be displayed only once.

### 6. Build for Production

```bash
pnpm build
```

### 7. Start the Server

```bash
pnpm start
```

The application will be available at `http://localhost:3000` (or your configured PORT).

---

## Production Deployment with PM2

For production environments, use PM2 to keep the application running:

### Install PM2

```bash
npm install -g pm2
```

### Start Application

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Monitor Application

```bash
pm2 status
pm2 logs khiladi-management
pm2 monit
```

---

## Nginx Reverse Proxy Configuration

If using Nginx as a reverse proxy:

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

---

## SSL/HTTPS Configuration

Use Certbot to get free SSL certificates:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Admin Credentials

**Default Admin Username:** `admin`  
**Default Admin Password:** See `ADMIN_CREDENTIALS.txt` (generated during initialization)

**⚠️ SECURITY:** Change the default password immediately after first login!

---

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Ensure database server is running
- Check firewall rules allow database connections

### Port Already in Use

Change the `PORT` in `.env` to an available port.

### Application Won't Start

Check logs:

```bash
pm2 logs khiladi-management
```

---

## Backup & Maintenance

### Database Backup

```bash
mysqldump -u username -p database_name > backup_$(date +%Y%m%d).sql
```

### Application Updates

```bash
git pull origin main  # if using git
pnpm install
pnpm build
pm2 restart khiladi-management
```

---

## Security Recommendations

1. ✅ Change default admin password immediately
2. ✅ Use strong JWT_SECRET (minimum 32 characters)
3. ✅ Enable HTTPS/SSL for production
4. ✅ Configure firewall to allow only necessary ports
5. ✅ Regular database backups
6. ✅ Keep Node.js and dependencies updated
7. ✅ Use environment variables for sensitive data
8. ✅ Implement rate limiting for login attempts (future enhancement)

---

## Support

For issues or questions, refer to the project documentation or contact the development team.

---

**Last Updated:** January 29, 2026  
**Version:** 1.0.0 (Standalone Authentication)
