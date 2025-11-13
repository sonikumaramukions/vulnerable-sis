# Quick Azure Deployment Guide

## Prerequisites Check
```bash
# Check if Azure CLI is installed
az --version

# If not installed, install it:
# Linux: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
# macOS: brew install azure-cli
# Windows: Download from https://aka.ms/installazurecliwindows
```

## Step-by-Step Deployment

### 1. Login to Azure
```bash
az login
```

### 2. Set Variables (Customize these)
```bash
RESOURCE_GROUP="rg-tripathi-sis"
LOCATION="eastus"
APP_NAME="tripathi-sis-app"
DB_SERVER="tripathi-mysql-server"
DB_ADMIN="tripathidbadmin"
DB_PASSWORD="YourSecurePassword123!"  # Change this!
```

### 3. Create Resources (Run all at once)
```bash
# Create Resource Group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create MySQL Server
az mysql flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER \
  --location $LOCATION \
  --admin-user $DB_ADMIN \
  --admin-password "$DB_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 8.0.21 \
  --storage-size 32 \
  --public-access 0.0.0.0

# Create Database
az mysql flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER \
  --database-name student_portal

# Allow Azure Services
az mysql flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Create App Service Plan
az appservice plan create \
  --name tripathi-sis-plan \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan tripathi-sis-plan \
  --name $APP_NAME \
  --runtime "NODE:18-lts"
```

### 4. Configure App Settings
```bash
# Get MySQL Host
MYSQL_HOST=$(az mysql flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER \
  --query fullyQualifiedDomainName -o tsv)

# Set Environment Variables
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --settings \
    DB_HOST="$MYSQL_HOST" \
    DB_USER="$DB_ADMIN" \
    DB_PASSWORD="$DB_PASSWORD" \
    DB_NAME="student_portal" \
    DB_PORT="3306" \
    NODE_ENV="production" \
    PORT="8080" \
    WEBSITE_NODE_DEFAULT_VERSION="18-lts" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true"

# Configure startup
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --startup-file "node app.js" \
  --always-on true \
  --https-only true
```

### 5. Import Database Schema
```bash
# Get connection details
echo "MySQL Host: $MYSQL_HOST"
echo "Username: $DB_ADMIN"
echo "Database: student_portal"

# Import schema (you'll be prompted for password)
cd /home/soni-lap/Documents/college_works/vunerable_application/vulnerable-sis
mysql -h $MYSQL_HOST -u $DB_ADMIN -p student_portal < database/schema.sql
```

### 6. Deploy Application

#### Option A: Git Deployment (Recommended)
```bash
# Get deployment URL
DEPLOYMENT_URL=$(az webapp deployment source show \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --query url -o tsv)

# Initialize git if not done
cd /home/soni-lap/Documents/college_works/vunerable_application/vulnerable-sis
git init
git add .
git commit -m "Initial commit for Azure deployment"

# Add Azure remote and push
git remote add azure $DEPLOYMENT_URL
git push azure main
```

#### Option B: ZIP Deployment
```bash
cd /home/soni-lap/Documents/college_works/vunerable_application/vulnerable-sis
zip -r deploy.zip . -x "*.git*" "node_modules/*" "*.log" ".DS_Store"

az webapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --src deploy.zip
```

### 7. Get Your App URL
```bash
az webapp show \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --query defaultHostName -o tsv
```

### 8. View Logs
```bash
az webapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME
```

## Troubleshooting

### Check App Status
```bash
az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query state
```

### Restart App
```bash
az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP
```

### View App Settings
```bash
az webapp config appsettings list --name $APP_NAME --resource-group $RESOURCE_GROUP
```

### Test Database Connection
```bash
mysql -h $MYSQL_HOST -u $DB_ADMIN -p -e "USE student_portal; SHOW TABLES;"
```

## Important Notes

1. **Save your database password** - You'll need it for schema import
2. **First deployment may take 5-10 minutes**
3. **Check logs if app doesn't start**
4. **Database connection may take a few seconds on first request**

## Clean Up (When Done Testing)

```bash
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

