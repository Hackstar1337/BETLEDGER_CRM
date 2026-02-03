# Khiladi247 Management Panel

A comprehensive casino management panel with Daily Ledger System for immutable financial tracking.

## 🚀 Features

- **Daily Ledger System** - Immutable financial records
- **Panel Management** - Track player panels and balances
- **Bank Account Management** - Manage multiple bank accounts
- **Transaction Logging** - Complete audit trail
- **Real-time Updates** - WebSocket integration
- **Admin Authentication** - Secure admin access

## 📋 Prerequisites

- Node.js 18+
- MySQL 8.0+
- npm or pnpm

## 🛠️ Local Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd khiladi-management-panel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Setup database**
   ```bash
   npm run db:setup
   npm run db:migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🚀 Railway Deployment

### Automatic Deployment

This project is configured for automatic deployment on Railway:

1. **Connect GitHub Repository**
   - Go to [Railway](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select this repository

2. **Set Environment Variables**
   In Railway dashboard, set these variables:
   ```
   DATABASE_URL=mysql://user:password@host:port/database
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=your-jwt-secret
   ```

3. **Deploy**
   - Railway will automatically detect and deploy the Node.js app
   - Database tables are created automatically on first deploy
   - Initial ledger records are populated from existing data

### Manual Deployment Steps

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to Railway**
   ```bash
   npm run deploy:prod
   ```

## 📊 Daily Ledger System

The Daily Ledger System ensures immutable financial tracking:

### Tables
- `panel_daily_ledger` - Daily panel balances
- `bank_daily_ledger` - Daily bank account balances
- `transaction_log` - All financial transactions
- `audit_log` - System audit trail

### Features
- **Immutable Records** - Once closed, records cannot be modified
- **Daily Reset** - Automatic midnight boundary management
- **Complete Audit** - Every transaction is logged
- **Validation** - Prevents modifications to closed ledgers

## 🔧 API Endpoints

### Authentication
- `POST /api/trpc/standaloneAuth.login` - Admin login

### Ledger Management
- `GET /api/trpc/ledger.getResetStatus` - Get daily reset status
- `GET /api/trpc/ledger.getPanelLedgerHistory` - Get panel ledger history
- `GET /api/trpc/ledger.getBankLedgerHistory` - Get bank ledger history
- `GET /api/trpc/ledger.getTransactionHistory` - Get transaction log

### Health Check
- `GET /health` - Application health status

## 🧪 Testing

Run tests locally:
```bash
npm test
```

Comprehensive test suite:
```bash
node scripts/comprehensive-test.cjs
```

## 📝 Environment Variables

### Required
- `DATABASE_URL` - MySQL connection string
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port

### Optional
- `JWT_SECRET` - JWT token secret
- `SESSION_SECRET` - Session encryption key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret

## 🔄 CI/CD Pipeline

The project includes a GitHub Actions workflow that:

1. **Tests** - Runs tests on every push
2. **Builds** - Builds the project
3. **Deploys** - Automatically deploys to Railway on main branch push
4. **Verifies** - Checks deployment health

## 📁 Project Structure

```
├── client/          # React frontend
├── server/          # Node.js backend
│   ├── _core/      # Core server logic
│   ├── routers/    # API routes
│   └── scripts/    # Utility scripts
├── drizzle/         # Database schemas
├── scripts/         # Deployment scripts
└── shared/          # Shared types
```

## 🛠️ Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run db:setup     # Setup database
npm run db:migrate   # Run migrations
npm run db:backup    # Backup database
```

## 📚 Documentation

- [Daily Ledger System Guide](./DAILY_LEDGER_GUIDE.md)
- [API Documentation](./API_DOCS.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please contact:
- Email: support@khiladi247.com
- Issues: [GitHub Issues](https://github.com/your-repo/issues)

---

**Built with ❤️ for Khiladi247**
