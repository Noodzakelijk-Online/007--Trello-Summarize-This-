# PowerShell Deployment Script for Summarize This Web Application

# Variables
$ImageName = "ghcr.io/your-github-username/summarize-this"
$ContainerName = "summarize-this-web"
$ComposeFile = "docker-compose.yml"

# 1. Stop and remove the existing container
Write-Host "Stopping and removing existing container..."
if (docker ps -a --format "{{.Names}}" | findstr /r "^${ContainerName}$_web_1") {
    docker-compose -f $ComposeFile down
} else {
    Write-Host "No existing container found."
}

# 2. Pull the latest Docker image
Write-Host "Pulling the latest Docker image..."
docker pull "${ImageName}:main"

# 3. Start the services using docker-compose
Write-Host "Starting the application..."
docker-compose -f $ComposeFile up -d

# 4. Display container status
Write-Host "Deployment complete. Current container status:"
docker ps -f "name=${ContainerName}"

