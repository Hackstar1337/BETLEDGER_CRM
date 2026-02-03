# Environment Configuration Guide

## Required Environment Variables

The Khiladi247 Management Panel requires the following environment variables for standalone deployment:

### 1. Database Configuration (Required)

```bash
DATABASE_URL="mysql://username:password@host:port/database"
```

**Example:**

```bash
DATABASE_URL="mysql://root:mypassword@localhost:3306/khiladi247"
```

### 2. JWT Secret (Required)

```bash
JWT_SECRET="your-super-secret-jwt-key"
```

**Generate a secure JWT secret:**

```bash
openssl rand -base64 32
```

### 3. Server Configuration (Optional)

```bash
PORT=3000
NODE_ENV=production
```

## Setup Instructions

### For Development

1. Create a `.env` file in the project root
2. Add the required environment variables:

   ```bash
   DATABASE_URL="mysql://root:password@localhost:3306/khiladi247"
   JWT_SECRET="your-generated-secret-key"
   PORT=3000
   NODE_ENV=development
   ```

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Push database schema:

   ```bash
   pnpm db:push
   ```

5. Start development server:
   ```bash
   pnpm dev
   ```

### For Production Deployment

1. Set environment variables on your VPS/hosting:

   ```bash
   export DATABASE_URL="mysql://user:pass@host:port/db"
   export JWT_SECRET="your-secret"
   export NODE_ENV=production
   export PORT=3000
   ```

2. Build the application:

   ```bash
   pnpm install
   pnpm build
   ```

3. Start with PM2:

   ```bash
   pm2 start ecosystem.config.js
   ```

   Or start directly:

   ```bash
   pnpm start
   ```

## Admin Credentials

Default admin credentials are automatically created on first run:

- **Username:** `admin`
- **Password:** Randomly generated and saved to `ADMIN_CREDENTIALS.txt`

**Important:** Change the password after first login via Settings > Change Password

## Database Setup

The application uses MySQL/MariaDB. Ensure your database server is running and accessible.

**Create database:**

```sql
CREATE DATABASE khiladi247 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Run migrations:**

```bash
pnpm db:push
```

## Optional Features

### S3-Compatible Storage (for file uploads)

```bash
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-bucket-name"
```

### Email/SMTP (for notifications)

```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

## Troubleshooting

### Database Connection Issues

1. Verify MySQL/MariaDB is running:

   ```bash
   systemctl status mysql
   ```

2. Test database connection:

   ```bash
   mysql -u username -p -h host database
   ```

3. Check firewall rules allow database port (default: 3306)

### Port Already in Use

Change the PORT environment variable:

```bash
export PORT=8080
```

### JWT Token Issues

Regenerate JWT_SECRET and restart the server:

```bash
export JWT_SECRET=$(openssl rand -base64 32)
pm2 restart khiladi247
```

## Security Recommendations

1. **Use strong JWT secret** - Generate with `openssl rand -base64 32`
2. **Change default admin password** immediately after first login
3. **Use HTTPS** in production with SSL/TLS certificates
4. **Restrict database access** to localhost or specific IPs
5. **Enable firewall** and only allow necessary ports (80, 443, 3000)
6. **Regular backups** of database and application files
7. **Keep dependencies updated** with `pnpm update`

## Support

For deployment issues or questions, refer to:

- DEPLOYMENT_GUIDE.md - Complete deployment instructions
- README.md - Application overview and features
