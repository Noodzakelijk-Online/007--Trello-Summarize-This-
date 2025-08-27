# Docker Deployment Guide for Summarize This

This guide provides comprehensive instructions for deploying the Summarize This application using Docker and Docker Compose.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Configuration](#environment-configuration)
4. [Development Setup](#development-setup)
5. [Production Deployment](#production-deployment)
6. [Service Architecture](#service-architecture)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

## Prerequisites

Before deploying the application, ensure you have the following installed:

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Git**: For cloning the repository
- **Minimum System Requirements**:
  - 4GB RAM
  - 2 CPU cores
  - 20GB available disk space

### Installing Docker

#### Ubuntu/Debian
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### macOS
```bash
brew install docker docker-compose
```

#### Windows
Download and install Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)

## Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd summarize-this
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the application**:
   ```bash
   docker-compose up -d
   ```

4. **Access the application**:
   - Main application: http://localhost:3000
   - Monitoring dashboard: http://localhost:3001

## Environment Configuration

The application uses environment variables for configuration. Copy `.env.example` to `.env` and update the following key variables:

### Required Variables
```env
# API Keys
OPENAI_API_KEY=your_openai_api_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here

# Security
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password_here
```

### Optional Variables
```env
# Feature Flags
ENABLE_TRANSCRIPTION=true
ENABLE_SUMMARIZATION=true
ENABLE_REAL_TIME=true

# Performance
WORKER_CONCURRENCY=5
CACHE_TTL=3600
```

## Development Setup

For development, use the development Docker Compose configuration:

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f app

# Stop development environment
docker-compose -f docker-compose.dev.yml down
```

### Development Services

The development setup includes additional services for easier development:

- **Redis Commander**: http://localhost:8081 (Redis management)
- **MongoDB Express**: http://localhost:8082 (MongoDB management)
- **pgAdmin**: http://localhost:8083 (PostgreSQL management)
- **Mailhog**: http://localhost:8025 (Email testing)
- **Kibana**: http://localhost:5601 (Log visualization)

### Development Features

- **Hot Reload**: Code changes are automatically reflected
- **Debug Port**: Node.js debugging on port 9229
- **Volume Mounting**: Source code is mounted for live editing
- **Reduced Resource Usage**: Optimized for development

## Production Deployment

### 1. Prepare Production Environment

```bash
# Set production environment
export NODE_ENV=production

# Copy production environment file
cp .env.example .env.production
# Edit .env.production with production values
```

### 2. Build and Deploy

```bash
# Build production images
docker-compose build

# Start production services
docker-compose up -d

# Verify deployment
docker-compose ps
docker-compose logs app
```

### 3. SSL/TLS Configuration

For production, configure SSL certificates:

1. **Obtain SSL certificates** (Let's Encrypt recommended):
   ```bash
   # Using certbot
   sudo certbot certonly --standalone -d your-domain.com
   ```

2. **Copy certificates to nginx/ssl directory**:
   ```bash
   sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
   sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
   ```

3. **Update nginx configuration** to enable HTTPS (uncomment HTTPS server block in `nginx/nginx.conf`)

### 4. Production Optimizations

- **Resource Limits**: Configure appropriate CPU and memory limits
- **Health Checks**: Ensure all health checks are properly configured
- **Backup Strategy**: Set up automated backups for databases
- **Monitoring**: Configure alerting and monitoring

## Service Architecture

The application consists of the following services:

### Core Services

1. **App** (`app`):
   - Main Node.js application
   - Handles API requests and business logic
   - Port: 3000

2. **Redis** (`redis`):
   - Caching and session storage
   - Queue management
   - Port: 6379

3. **MongoDB** (`mongodb`):
   - Document storage
   - User data and logs
   - Port: 27017

4. **PostgreSQL** (`postgres`):
   - Relational data storage
   - Transactions and analytics
   - Port: 5432

### Infrastructure Services

5. **Nginx** (`nginx`):
   - Reverse proxy and load balancer
   - SSL termination
   - Ports: 80, 443

6. **Elasticsearch** (`elasticsearch`):
   - Log aggregation and search
   - Port: 9200

7. **Kibana** (`kibana`):
   - Log visualization
   - Port: 5601

8. **Prometheus** (`prometheus`):
   - Metrics collection
   - Port: 9090

9. **Grafana** (`grafana`):
   - Metrics visualization
   - Port: 3001

### Service Dependencies

```
nginx → app → redis, mongodb, postgres
kibana → elasticsearch
grafana → prometheus
```

## Monitoring and Logging

### Application Metrics

Access Grafana dashboard at http://localhost:3001:
- Default credentials: admin/admin
- Pre-configured dashboards for application metrics
- Real-time monitoring of system resources

### Log Management

Access Kibana at http://localhost:5601:
- Centralized log aggregation
- Search and filter application logs
- Create custom dashboards and alerts

### Health Checks

All services include health checks:
```bash
# Check service health
docker-compose ps

# View health check logs
docker inspect <container_name> | grep Health
```

### Prometheus Metrics

Access Prometheus at http://localhost:9090:
- Query application metrics
- Set up alerting rules
- Monitor service availability

## Troubleshooting

### Common Issues

#### 1. Port Conflicts
```bash
# Check port usage
sudo netstat -tulpn | grep :3000

# Stop conflicting services
sudo systemctl stop apache2  # Example
```

#### 2. Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER logs uploads temp

# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker
```

#### 3. Database Connection Issues
```bash
# Check database logs
docker-compose logs postgres
docker-compose logs mongodb

# Reset database volumes
docker-compose down -v
docker-compose up -d
```

#### 4. Memory Issues
```bash
# Check memory usage
docker stats

# Increase Docker memory limit (Docker Desktop)
# Settings → Resources → Memory
```

### Debugging Commands

```bash
# View all logs
docker-compose logs

# Follow specific service logs
docker-compose logs -f app

# Execute commands in container
docker-compose exec app sh

# Check container resource usage
docker stats

# Inspect container configuration
docker inspect <container_name>
```

### Log Locations

- **Application logs**: `./logs/`
- **Nginx logs**: `./logs/nginx/`
- **Container logs**: `docker-compose logs <service>`

## Maintenance

### Regular Maintenance Tasks

#### 1. Update Dependencies
```bash
# Update Docker images
docker-compose pull

# Rebuild with latest base images
docker-compose build --no-cache
```

#### 2. Database Maintenance
```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U postgres summarize_this > backup.sql

# Backup MongoDB
docker-compose exec mongodb mongodump --out /tmp/backup

# Clean up old logs
docker system prune -f
```

#### 3. Security Updates
```bash
# Update system packages in containers
docker-compose build --no-cache

# Scan for vulnerabilities
docker scan summarize-this:latest
```

#### 4. Performance Optimization
```bash
# Analyze container resource usage
docker stats --no-stream

# Clean up unused resources
docker system prune -a
```

### Backup Strategy

#### Automated Backups
```bash
#!/bin/bash
# backup.sh - Daily backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/$DATE"

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker-compose exec -T postgres pg_dump -U postgres summarize_this > $BACKUP_DIR/postgres.sql

# Backup MongoDB
docker-compose exec -T mongodb mongodump --archive > $BACKUP_DIR/mongodb.archive

# Backup application data
tar -czf $BACKUP_DIR/app_data.tar.gz logs uploads

# Clean old backups (keep 30 days)
find /backups -type d -mtime +30 -exec rm -rf {} \;
```

#### Restore Procedures
```bash
# Restore PostgreSQL
docker-compose exec -T postgres psql -U postgres -d summarize_this < backup/postgres.sql

# Restore MongoDB
docker-compose exec -T mongodb mongorestore --archive < backup/mongodb.archive

# Restore application data
tar -xzf backup/app_data.tar.gz
```

### Scaling

#### Horizontal Scaling
```bash
# Scale application instances
docker-compose up -d --scale app=3

# Use load balancer configuration
# Update nginx.conf with multiple upstream servers
```

#### Vertical Scaling
```yaml
# docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

### Monitoring Alerts

Set up alerts for:
- High CPU/memory usage
- Database connection failures
- Application errors
- Disk space usage
- Service downtime

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to version control
2. **Network Security**: Use Docker networks to isolate services
3. **User Permissions**: Run containers with non-root users
4. **Regular Updates**: Keep base images and dependencies updated
5. **SSL/TLS**: Always use HTTPS in production
6. **Firewall**: Configure appropriate firewall rules
7. **Secrets Management**: Use Docker secrets or external secret management

## Support

For additional support:
- Check the troubleshooting section above
- Review application logs for error details
- Consult Docker and Docker Compose documentation
- Contact the development team for application-specific issues

---

This guide provides a comprehensive overview of deploying and maintaining the Summarize This application using Docker. For specific configuration questions or issues not covered here, please refer to the individual service documentation or contact the development team.

