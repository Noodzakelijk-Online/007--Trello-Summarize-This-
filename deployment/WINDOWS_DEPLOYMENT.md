# Windows 11 Manual Deployment Guide

This guide provides instructions for manually deploying the Summarize This web application on a Windows 11 machine using Docker.

## Prerequisites

- **Docker Desktop for Windows**: Ensure you have Docker Desktop installed and running on your Windows 11 machine. You can download it from the [Docker website](https://www.docker.com/products/docker-desktop).
- **PowerShell**: This script is designed to be run in PowerShell.
- **GitHub**: You need to have `git` installed to clone the repository.

## Deployment Steps

1. **Clone the Repository**:

   Open a PowerShell terminal and clone the repository to your local machine:

   ```powershell
   git clone https://github.com/your-github-username/summarize-this.git
   cd summarize-this/reorganized/web-app
   ```

2. **Log in to GitHub Container Registry**:

   You need to log in to the GitHub Container Registry to pull the Docker image. Use a Personal Access Token (PAT) with `read:packages` scope as your password.

   ```powershell
   docker login ghcr.io -u YOUR_GITHUB_USERNAME -p YOUR_PAT
   ```

3. **Run the Deployment Script**:

   Navigate to the `deployment/scripts` directory and run the `deploy.ps1` script:

   ```powershell
   cd ../deployment/scripts
   ./deploy.ps1
   ```

   The script will:
   - Stop and remove any existing containers.
   - Pull the latest Docker image from the GitHub Container Registry.
   - Start the application and its dependencies using `docker-compose`.

4. **Verify the Deployment**:

   Once the script is finished, you can check the status of the running containers:

   ```powershell
   docker ps
   ```

   You should see the `summarize-this-web`, `summarize-this-redis`, and `summarize-this-postgres` containers running.

5. **Access the Application**:

   The application will be available at [http://localhost:3000](http://localhost:3000).

## Updating the Application

To update the application to the latest version, simply re-run the `deploy.ps1` script. It will pull the latest image and restart the services.


