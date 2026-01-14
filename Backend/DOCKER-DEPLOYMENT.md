# Docker Deployment Guide

## Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+

### Development Deployment

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Backend
   ```

2. **Start services:**
   ```bash
   docker-compose up -d
   ```

3. **Check service status:**
   ```bash
   docker-compose ps
   ```

4. **View logs:**
   ```bash
   docker-compose logs -f api
   ```

5. **Access the API:**
   - API: http://localhost:3000
   - Health Check: http://localhost:3000/api/v1/monitoring/health
   - API Docs: http://localhost:3000/api-docs

### Production Deployment

1. **Configure environment variables:**
   ```bash
   cp .env.docker .env
   # Edit .env and change all secret values
   nano .env
   ```

2. **Build and start with Nginx:**
   ```bash
   docker-compose --profile production up -d --build
   ```

3. **Configure SSL (for HTTPS):**
   - Place SSL certificates in `./ssl/` directory
   - Uncomment HTTPS section in `nginx.conf`
   - Restart nginx: `docker-compose restart nginx`

## Docker Commands

### Build and Run

```bash
# Build the image
docker-compose build

# Start services in background
docker-compose up -d

# Start with production profile (includes Nginx)
docker-compose --profile production up -d

# Rebuild and start
docker-compose up -d --build
```

### Management

```bash
# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes database)
docker-compose down -v

# Restart a specific service
docker-compose restart api

# View logs
docker-compose logs -f api
docker-compose logs -f mongo

# Execute commands in container
docker-compose exec api sh
docker-compose exec mongo mongosh
```

### Monitoring

```bash
# Check service health
docker-compose ps

# View resource usage
docker stats

# Check API health
curl http://localhost:3000/api/v1/monitoring/health

# Check database stats
curl http://localhost:3000/api/v1/monitoring/database-stats
```

## Service Architecture

### Services

1. **mongo** - MongoDB database (port 27017)
2. **api** - Node.js backend API (port 3000)
3. **nginx** - Reverse proxy (ports 80, 443) - Production only

### Networks

- `indus-traders-network` - Bridge network for inter-service communication

### Volumes

- `mongo-data` - MongoDB data persistence
- `mongo-config` - MongoDB configuration

## Environment Variables

Key environment variables (set in `.env` file):

```bash
# Required
JWT_SECRET=<strong-random-secret>
REFRESH_TOKEN_SECRET=<strong-random-secret>
MONGODB_URI=mongodb://mongo:27017/indus_traders

# Optional
TWILIO_ACCOUNT_SID=<your-sid>
TWILIO_AUTH_TOKEN=<your-token>
```

## Database Management

### Backup Database

```bash
# Create backup
docker-compose exec mongo mongodump --db indus_traders --out /data/backup

# Copy backup to host
docker cp indus-traders-mongo:/data/backup ./backup
```

### Restore Database

```bash
# Copy backup to container
docker cp ./backup indus-traders-mongo:/data/backup

# Restore
docker-compose exec mongo mongorestore --db indus_traders /data/backup/indus_traders
```

### Access MongoDB Shell

```bash
docker-compose exec mongo mongosh indus_traders
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Check if ports are available
netstat -ano | findstr :3000
netstat -ano | findstr :27017
```

### Database connection issues

```bash
# Verify MongoDB is running
docker-compose ps mongo

# Check MongoDB logs
docker-compose logs mongo

# Test connection
docker-compose exec api node -e "require('mongoose').connect('mongodb://mongo:27017/indus_traders').then(() => console.log('Connected')).catch(e => console.error(e))"
```

### API not responding

```bash
# Check API logs
docker-compose logs -f api

# Restart API
docker-compose restart api

# Check health endpoint
curl http://localhost:3000/api/v1/monitoring/health
```

### Reset everything

```bash
# Stop all services and remove volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Start fresh
docker-compose up -d --build
```

## Production Checklist

- [ ] Change all default secrets in `.env`
- [ ] Configure SSL certificates for HTTPS
- [ ] Set up proper DNS for your domain
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Configure automated backups
- [ ] Review and adjust resource limits
- [ ] Enable log rotation
- [ ] Set up CI/CD pipeline
- [ ] Test disaster recovery procedures

## Performance Tuning

### MongoDB Optimization

Edit `docker-compose.yml` to add MongoDB configuration:

```yaml
mongo:
  command: mongod --wiredTigerCacheSizeGB 1.5
```

### API Scaling

Run multiple API instances:

```bash
docker-compose up -d --scale api=3
```

Then configure Nginx to load balance across instances.

## Security Best Practices

1. **Never commit `.env` file** - Use `.env.example` as template
2. **Use strong secrets** - Generate with: `openssl rand -base64 32`
3. **Keep images updated** - Regularly rebuild with latest base images
4. **Use non-root user** - Already configured in Dockerfile
5. **Enable HTTPS** - Configure SSL certificates in production
6. **Limit network exposure** - Only expose necessary ports
7. **Regular backups** - Automate database backups
8. **Monitor logs** - Set up centralized logging

## Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- Review documentation: `/docs`
- API documentation: http://localhost:3000/api-docs
