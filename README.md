# Summarize This - Reorganized Project Structure

This repository has been completely reorganized to separate concerns and simplify deployment. The project now has a clear separation between the web application and the Electron desktop app.

## 🏗️ Project Structure

```
├── web-app/                    # Web application (main focus)
│   ├── backend/               # Node.js/Express backend
│   │   ├── enhanced-server.js # Main server file
│   │   ├── package.json       # Simplified dependencies
│   │   └── ...               # Server modules
│   ├── frontend/             # Frontend assets
│   ├── Dockerfile            # Simplified Docker configuration
│   ├── docker-compose.yml    # Production setup
│   └── docker-compose.dev.yml # Development setup
├── electron-app/             # Electron desktop application
│   ├── enhanced-main.js      # Electron main process
│   ├── enhanced-preload.js   # Preload script
│   └── preload.js           # Additional preload
├── deployment/               # Deployment configurations
│   ├── scripts/             # Deployment scripts
│   │   └── deploy.ps1       # Windows PowerShell deployment
│   └── WINDOWS_DEPLOYMENT.md # Windows deployment guide
├── docs/                    # Documentation
└── .github/                 # GitHub workflows
    └── workflows/           # Simplified CI/CD pipelines
        ├── ci.yml          # Main CI/CD pipeline
        ├── dependency-update.yml
        ├── security.yml
        └── release.yml
```

## 🚀 Quick Start

### Web Application (Recommended)

1. **Prerequisites**
   - Docker and Docker Compose
   - Node.js 18+ (for development)

2. **Development Setup**
   ```bash
   cd web-app
   docker-compose -f docker-compose.dev.yml up --build
   ```

3. **Production Setup**
   ```bash
   cd web-app
   docker-compose up --build -d
   ```

4. **Access the Application**
   - Web app: http://localhost:3000
   - Redis: localhost:6379
   - PostgreSQL: localhost:5432

### Windows 11 Deployment

For Windows 11 deployment, see the detailed guide: [deployment/WINDOWS_DEPLOYMENT.md](deployment/WINDOWS_DEPLOYMENT.md)

## 🔧 Key Improvements

### ✅ Simplified Architecture
- **Before**: 8+ services (Redis, MongoDB, PostgreSQL, Elasticsearch, Kibana, Prometheus, Grafana, Nginx)
- **After**: 3 essential services (App, Redis, PostgreSQL)

### ✅ Clear Separation of Concerns
- **Web App**: Standalone web service with simplified dependencies
- **Electron App**: Desktop application with Electron-specific files
- **Deployment**: Centralized deployment scripts and documentation

### ✅ Fixed CI/CD Workflows
- Corrected file paths for the new structure
- Removed references to non-existent files
- Simplified testing and deployment processes
- Added proper error handling

### ✅ Docker Optimization
- Single-stage Dockerfile for faster builds
- Reduced image size by removing unnecessary dependencies
- Proper health checks and security practices
- Development and production configurations

## 📦 Docker Services

### Web Application
- **Port**: 3000
- **Dependencies**: Redis, PostgreSQL
- **Health Check**: Built-in endpoint monitoring

### Redis
- **Port**: 6379
- **Purpose**: Caching and session management
- **Configuration**: Optimized for 256MB memory limit

### PostgreSQL
- **Port**: 5432
- **Purpose**: Primary data storage
- **Database**: `summarize_this`

## 🔄 CI/CD Pipeline

The simplified CI/CD pipeline includes:

1. **Testing**: Linting, unit tests, security audits
2. **Building**: Docker image creation and push to GitHub Container Registry
3. **Deployment**: Automated deployment to staging and production
4. **Security**: Automated security scanning and dependency updates

## 🪟 Windows Deployment

The project includes a PowerShell script for easy Windows 11 deployment:

```powershell
# Navigate to deployment scripts
cd deployment/scripts

# Run the deployment script
./deploy.ps1
```

This script will:
- Stop existing containers
- Pull the latest Docker image
- Start the application with all dependencies

## 🛠️ Development

### Backend Development
```bash
cd web-app/backend
npm install
npm run dev
```

### Running Tests
```bash
cd web-app/backend
npm run test:ci
```

### Linting and Formatting
```bash
cd web-app/backend
npm run lint
npm run format
```

## 📋 Environment Variables

Key environment variables for the web application:

- `NODE_ENV`: Environment (development/production)
- `PORT`: Application port (default: 3000)
- `REDIS_URL`: Redis connection string
- `DATABASE_URL`: PostgreSQL connection string

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For deployment issues or questions:
- Check the [Windows Deployment Guide](deployment/WINDOWS_DEPLOYMENT.md)
- Review the Docker logs: `docker-compose logs`
- Open an issue in this repository

---

**Note**: This reorganized structure focuses on simplicity and maintainability while preserving all core functionality of the Summarize This application.
