# Enterprise Security Compliance Platform

A production-ready, full-stack enterprise web application for managing security compliance across multiple tools and regions.

## Overview

The Enterprise Security Compliance Platform enables organizations to:

- **Track device compliance** across 5 security tools (Cube, AD, DC, KES, DLP)
- **Upload monthly inventories** via Excel files with automatic processing
- **Calculate compliance metrics** with cross-tool device matching
- **Visualize data** through 8 interactive dashboard pages
- **Manage alerts** with automatic threshold-based notifications
- **Audit all actions** with a complete security trail
- **Control access** with role-based permissions (5 roles)

## Quick Start

### Docker Compose (Recommended)

```bash
git clone <your-repo>
cd enterprise-compliance-platform
docker-compose up -d
```

**Access:**
- Frontend: http://localhost
- Backend API: http://localhost:5000/api
- Database: postgres://localhost:5432

**Demo Credentials:**
- Email: `admin@enterprise.com`
- Password: `SecurePass123!`

### Manual Setup

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (another terminal)
cd frontend && npm install && npm run dev

# Access at http://localhost:3000
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + Custom Dark Theme |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Node.js + Express.js |
| Database | PostgreSQL 15 |
| Auth | JWT + Bcrypt |
| File Handling | Multer + XLSX |
| Containerization | Docker + Docker Compose |
| Web Server | Nginx |

## Project Structure

```
enterprise-compliance-platform/
├── backend/
│   ├── config/           # Database & logger config
│   ├── middleware/        # Auth & upload middleware
│   ├── routes/            # API route handlers
│   ├── uploads/           # Uploaded files directory
│   ├── server.js          # Express app entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # React hooks (auth context)
│   │   ├── pages/         # Page components
│   │   │   └── admin/     # Admin-only pages
│   │   ├── services/      # API service layer
│   │   ├── styles/        # CSS styles
│   │   ├── App.jsx        # Root component with routing
│   │   └── main.jsx       # Entry point
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── database/
│   └── 01_database_schema.sql
├── docs/
│   └── 09_IMPLEMENTATION_GUIDE.md
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| GET | `/api/auth/profile` | Get current user profile |

### Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload Excel inventory file |
| GET | `/api/upload/history` | Get upload history |
| GET | `/api/upload/:id` | Get upload details |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Executive summary data |
| GET | `/api/dashboard/compliance/:baseline` | Baseline compliance data |
| GET | `/api/dashboard/trends` | Historical trend data |
| GET | `/api/dashboard/matrix` | Compliance matrix |

### Devices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices/search` | Search devices |
| GET | `/api/devices/:deviceKey` | Device details |
| GET | `/api/devices/:deviceKey/history` | Device history |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | List alerts |
| PUT | `/api/alerts/:id/acknowledge` | Acknowledge alert |
| GET | `/api/alerts/stats` | Alert statistics |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/audit-logs` | Audit log trail |
| GET | `/api/admin/users` | List users |
| PUT | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Deactivate user |
| GET | `/api/admin/settings` | Platform settings |
| GET | `/api/admin/stats` | System statistics |

## Dashboard Pages

1. **Executive Summary** - KPI cards, compliance gauges, matrix view, recent uploads
2. **Cube Baseline** - Master inventory compliance analysis
3. **AD Baseline** - Active Directory device tracking
4. **DC Baseline** - Desktop Central compliance
5. **KES Baseline** - Kaspersky endpoint security coverage
6. **DLP Baseline** - Data loss prevention compliance
7. **Dynamic Baseline** - Switchable baseline selector
8. **Device Inspector** - Individual device search & history

### Admin Pages
- Upload Manager
- Alerts Manager
- User Management
- Audit Logs
- Settings

## User Roles

| Role | Access |
|------|--------|
| Super Admin | Full system access, all regions |
| National Lead | All regions, dashboards |
| Regional Manager | Own region only |
| Viewer | Read-only access |
| Auditor | Audit logs + reports |

## Security Features

- JWT authentication with configurable expiration
- Role-based access control (RBAC)
- Row-level security with regional data isolation
- Password hashing with bcrypt (10 rounds)
- Complete audit logging
- Security headers (Helmet.js)
- Rate limiting for DDoS protection
- CORS configuration
- SQL injection prevention (parameterized queries)
- XSS protection headers

## Compliance Thresholds

| Status | Threshold |
|--------|-----------|
| Green (Compliant) | >= 90% |
| Amber (Needs Attention) | 75-89% |
| Orange (Warning) | 60-74% |
| Red (Critical) | < 60% |

## File Upload Format

Files should follow the naming convention:
```
YYYY_MM_TOOL_Inventory.xlsx
```

Example: `2026_01_Cube_Inventory.xlsx`

## Database Schema

9 core tables with 15+ indexes and 2 analytical views:
- `users` - Authentication & RBAC
- `devices` - Master device registry
- `inventories` - Tool-specific data
- `uploads` - File tracking
- `compliance_results` - Calculated metrics
- `device_mapping` - Cross-tool indexing
- `alerts` - Notifications
- `audit_logs` - Security trail
- `compliance_snapshots` - Historical tracking

## License

Proprietary - Enterprise Use Only

## Version

**v1.0.0** | Last Updated: May 2026
