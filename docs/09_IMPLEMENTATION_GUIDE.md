# Implementation Guide

## Enterprise Security Compliance Platform - Step-by-Step Deployment

---

## Prerequisites

- **Node.js** >= 18.x
- **PostgreSQL** 15.x
- **Docker** & Docker Compose (recommended)
- **Git**

---

## Option 1: Docker Compose (Recommended)

### 1. Clone and Start

```bash
git clone <your-repo-url>
cd enterprise-compliance-platform
docker-compose up -d
```

### 2. Verify Services

```bash
# Check all services are running
docker-compose ps

# Check backend health
curl http://localhost:5000/api/health

# Access frontend
open http://localhost
```

### 3. Login

- **URL:** http://localhost
- **Email:** admin@enterprise.com
- **Password:** SecurePass123!

---

## Option 2: Manual Setup

### 1. Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE compliance_platform;"

# Run schema
psql -U postgres -d compliance_platform -f database/01_database_schema.sql
```

### 2. Backend Setup

```bash
cd backend

# Copy environment file
cp ../.env.example .env

# Edit .env with your database credentials
# nano .env

# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:3000
```

---

## Production Deployment

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DB_HOST | PostgreSQL host | localhost |
| DB_PORT | PostgreSQL port | 5432 |
| DB_NAME | Database name | compliance_platform |
| DB_USER | Database user | postgres |
| DB_PASSWORD | Database password | - |
| JWT_SECRET | JWT signing key | - |
| PORT | Backend port | 5000 |
| CORS_ORIGIN | Frontend URL | http://localhost:3000 |
| NODE_ENV | Environment | development |

### Build Frontend for Production

```bash
cd frontend
npm run build
# Output in frontend/dist/
```

### Using PM2 (Process Manager)

```bash
npm install -g pm2
cd backend
pm2 start server.js --name "compliance-api"
pm2 save
pm2 startup
```

### SSL/TLS Setup

Configure your reverse proxy (Nginx) with Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Data Upload Guide

### File Naming Convention

```
YYYY_MM_TOOL_Inventory.xlsx
```

Examples:
- `2026_01_Cube_Inventory.xlsx`
- `2026_01_AD_Inventory.xlsx`
- `2026_01_DC_Inventory.xlsx`

### Required Excel Columns

| Column | Alternatives | Required |
|--------|-------------|----------|
| Serial Number | SerialNumber, serial_number | One of Serial Number or Computer Name |
| Computer Name | ComputerName, computer_name | One of Serial Number or Computer Name |
| OS Type | OSType, os_type, OS | Optional |
| OS Version | OSVersion, os_version | Optional |
| Region | region | Optional |
| Department | department | Optional |
| IP Address | IPAddress, ip_address | Optional |
| MAC Address | MACAddress, mac_address | Optional |

---

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:5000/api/health
```

### Database Monitoring

```sql
-- Check table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC;

-- Check active connections
SELECT count(*) FROM pg_stat_activity;
```

### Log Files

- Backend logs: `logs/combined.log`, `logs/error.log` (production)
- Docker logs: `docker-compose logs -f backend`

---

## Backup Strategy

### Database Backup

```bash
# Full backup
pg_dump -U postgres compliance_platform > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres compliance_platform < backup_20260120.sql
```

### Automated Backups (Cron)

```bash
# Add to crontab
0 2 * * * pg_dump -U postgres compliance_platform > /backups/compliance_$(date +\%Y\%m\%d).sql
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 5000 in use | `lsof -i :5000` then `kill -9 <PID>` |
| Database connection error | Check DB_HOST, DB_PORT, credentials |
| CORS error | Verify CORS_ORIGIN in .env |
| File upload fails | Check upload dir permissions, file size |
| Login fails | Verify JWT_SECRET matches |
