#!/bin/bash

# Azure App Service deployment script
# This script runs during deployment on Azure

echo "Starting Azure deployment..."

# Install dependencies in backend directory
echo "Installing dependencies..."
cd backend
npm install --production

# Create uploads directory if it doesn't exist
echo "Creating uploads directory..."
mkdir -p uploads
touch uploads/.gitkeep

# Ensure images directory exists with .gitkeep
echo "Ensuring images directory exists..."
cd ../frontend
mkdir -p images
touch images/.gitkeep

# Return to root for deployment
cd ..

echo "Deployment completed successfully!"
echo "Note: Make sure to upload your logo.png to frontend/images/ directory"

