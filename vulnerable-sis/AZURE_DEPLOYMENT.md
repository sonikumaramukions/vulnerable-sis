# Azure Deployment Guide - TRIPATHI GROUP OF INSTITUTIONS SIS

## ⚠️ IMPORTANT SECURITY WARNING
This application is **INTENTIONALLY VULNERABLE** for ethical hacking practice. 
- **DO NOT** expose this to the public internet without proper network security
- Use Azure Private Endpoints and Network Security Groups
- Consider using Azure App Service with authentication enabled
- Monitor and limit access to authorized users only

## Prerequisites

1. **Azure Account** with active subscription
2. **Azure CLI** installed ([Install Guide](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
3. **Git** installed
4. **Node.js** installed (for local testing)

## Step 1: Prepare Your Code

### 1.1 Create .gitignore (if not exists)
```bash
cd vulnerable-sis
cat > .gitignore << EOF
node_modules/
.env
.azure/
uploads/*
!uploads/.gitkeep
*.log
.DS_Store
EOF
```

### 1.2 Initialize Git Repository
```bash
cd /home/soni-lap/Documents/college_works/vunerable_application/vulnerable-sis
git init
git add .
git commit -m "Initial commit: Vulnerable SIS for ethical hacking practice"
```

## Step 2: Create Azure Resources

### 2.1 Login to Azure
```bash
az login
```

### 2.2 Create Resource Group
```bash
az group create --name rg-tripathi-sis --location eastus
```
(Replace `eastus` with your preferred region)

### 2.3 Create Azure Database for MySQL (Flexible Server)
```bash
# Create MySQL Flexible Server
az mysql flexible-server create \
  --resource-group rg-tripathi-sis \
  --name tripathi-mysql-server \
  --location eastus \
  --admin-user tripathidbadmin \
  --admin-password "YourSecurePassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 8.0.21 \
  --storage-size 32 \
  --public-access 0.0.0.0
```

**Note:** Replace `YourSecurePassword123!` with a strong password. Save this password!

### 2.4 Create Database
```bash
az mysql flexible-server db create \
  --resource-group rg-tripathi-sis \
  --server-name tripathi-mysql-server \
  --database-name student_portal
```

### 2.5 Configure Firewall (Allow Azure Services)
```bash
# Allow Azure services to access
az mysql flexible-server firewall-rule create \
  --resource-group rg-tripathi-sis \
  --name tripathi-mysql-server \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 2.6 Create App Service Plan
```bash
az appservice plan create \
  --name tripathi-sis-plan \
  --resource-group rg-tripathi-sis \
  --location eastus \
  --sku B1 \
  --is-linux
```

### 2.7 Create Web App
```bash
az webapp create \
  --resource-group rg-tripathi-sis \
  --plan tripathi-sis-plan \
  --name tripathi-sis-app \
  --runtime "NODE:18-lts"
```

## Step 3: Configure Application Settings

### 3.1 Set Environment Variables
```bash
# Get MySQL server FQDN
MYSQL_HOST=$(az mysql flexible-server show \
  --resource-group rg-tripathi-sis \
  --name tripathi-mysql-server \
  --query fullyQualifiedDomainName -o tsv)

# Set environment variables
az webapp config appsettings set \
  --resource-group rg-tripathi-sis \
  --name tripathi-sis-app \
  --settings \
    DB_HOST="$MYSQL_HOST" \
    DB_USER="tripathidbadmin" \
    DB_PASSWORD="YourSecurePassword123!" \
    DB_NAME="student_portal" \
    DB_PORT="3306" \
    NODE_ENV="production" \
    PORT="8080"
```

**Important:** Replace `YourSecurePassword123!` with the password you used in Step 2.3

### 3.2 Configure Startup Command
```bash
az webapp config set \
  --resource-group rg-tripathi-sis \
  --name tripathi-sis-app \
  --startup-file "node app.js"
```

### 3.3 Set Working Directory
```bash
az webapp config appsettings set \
  --resource-group rg-tripathi-sis \
  --name tripathi-sis-app \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

## Step 4: Import Database Schema

### 4.1 Get Connection String
```bash
# Get connection details
az mysql flexible-server show \
  --resource-group rg-tripathi-sis \
  --name tripathi-mysql-server \
  --query "{FQDN:fullyQualifiedDomainName, AdminUser:administratorLogin}" -o table
```

### 4.2 Import Schema (Option 1: Using MySQL Client)
```bash
# Install MySQL client if needed
# Ubuntu/Debian: sudo apt-get install mysql-client
# macOS: brew install mysql-client

mysql -h <FQDN> -u tripathidbadmin -p student_portal < database/schema.sql
```

### 4.3 Import Schema (Option 2: Using Azure Cloud Shell)
1. Go to [Azure Portal](https://portal.azure.com)
2. Open Cloud Shell (top bar)
3. Upload `database/schema.sql`
4. Run:
```bash
mysql -h <FQDN> -u tripathidbadmin -p student_portal < schema.sql
```

## Step 5: Deploy Application

### Option A: Deploy using Git (Recommended)

#### 5.1 Configure Local Git Deployment
```bash
az webapp deployment source config-local-git \
  --resource-group rg-tripathi-sis \
  --name tripathi-sis-app
```

#### 5.2 Get Deployment URL
```bash
DEPLOYMENT_URL=$(az webapp deployment source show \
  --resource-group rg-tripathi-sis \
  --name tripathi-sis-app \
  --query url -o tsv)

echo "Add this as remote: $DEPLOYMENT_URL"
```

#### 5.3 Add Remote and Push
```bash
cd /home/soni-lap/Documents/college_works/vunerable_application/vulnerable-sis
git remote add azure $DEPLOYMENT_URL
git push azure main
```

### Option B: Deploy using ZIP

#### 5.1 Create Deployment Package
```bash
cd /home/soni-lap/Documents/college_works/vunerable_application/vulnerable-sis
zip -r deploy.zip . -x "*.git*" "node_modules/*" "*.log"
```

#### 5.2 Deploy ZIP
```bash
az webapp deployment source config-zip \
  --resource-group rg-tripathi-sis \
  --name tripathi-sis-app \
  --src deploy.zip
```

### Option C: Deploy using VS Code Azure Extension

1. Install "Azure App Service" extension in VS Code
2. Sign in to Azure
3. Right-click on `backend` folder → "Deploy to Web App"
4. Select your web app

## Step 6: Configure App Service

### 6.1 Set Node Version
```bash
az webapp config appsettings set \
  --resource-group rg-tripathi-sis \
  --name tripathi-sis-app \
  --settings WEBSITE_NODE_DEFAULT_VERSION="18-lts"
```

### 6.2 Enable Always On (Optional but Recommended)
```bash
az webapp config set \
  --resource-group rg-tripathi-sis \
  --name tripathi-sis-app \
  --always-on true
```

### 6.3 Configure HTTPS Only
```bash
az webapp update \
  --resource-group rg-tripathi-sis \
  --name tripathi-sis-app \
  --https-only true
```

## Step 7: Update Application Code for Azure

The application code has been updated to use environment variables. Make sure `backend/app.js` uses:
- `process.env.DB_HOST` or `'localhost'`
- `process.env.DB_USER` or `'root'`
- `process.env.DB_PASSWORD` or `'password123'`
- `process.env.DB_NAME` or `'student_portal'`
- `process.env.PORT` or `3000`

## Step 8: Test Deployment

### 8.1 Get Web App URL
```bash
az webapp show \
  --resource-group rg-tripathi-sis \
  --name tripathi-sis-app \
  --query defaultHostName -o tsv
```

### 8.2 Access Application
Open the URL in your browser: `https://<your-app-name>.azurewebsites.net`

### 8.3 Check Logs
```bash
az webapp log tail \
  --resource-group rg-tripathi-sis \
  --name tripathi-sis-app
```

## Step 9: Security Recommendations

### 9.1 Restrict Database Access
- Use Private Endpoints for MySQL
- Configure Network Security Groups
- Limit firewall rules to specific IPs

### 9.2 Enable Authentication (Optional)
```bash
az webapp auth update \
  --resource-group rg-tripathi-sis \
  --name tripathi-sis-app \
  --enabled true \
  --action LoginWithAzureActiveDirectory
```

### 9.3 Monitor Application
- Enable Application Insights
- Set up alerts for unusual activity
- Monitor database connections

## Troubleshooting

### Database Connection Issues
1. Check firewall rules: `az mysql flexible-server firewall-rule list`
2. Verify connection string in App Settings
3. Test connection from Azure Cloud Shell

### Application Not Starting
1. Check logs: `az webapp log tail`
2. Verify Node.js version matches
3. Check startup command
4. Verify `package.json` has correct start script

### File Upload Issues
- Azure App Service has limited local storage
- Consider using Azure Blob Storage for uploads
- Update `routes/documents.js` to use Blob Storage

## Cost Optimization

- Use **B1** tier for App Service (Basic tier)
- Use **Burstable** tier for MySQL (cheapest option)
- Stop resources when not in use:
  ```bash
  az webapp stop --name tripathi-sis-app --resource-group rg-tripathi-sis
  ```

## Clean Up Resources (When Done)

```bash
az group delete --name rg-tripathi-sis --yes --no-wait
```

## Quick Reference Commands

```bash
# View all resources
az resource list --resource-group rg-tripathi-sis -o table

# View app settings
az webapp config appsettings list --name tripathi-sis-app --resource-group rg-tripathi-sis

# Restart app
az webapp restart --name tripathi-sis-app --resource-group rg-tripathi-sis

# View logs
az webapp log tail --name tripathi-sis-app --resource-group rg-tripathi-sis
```

## Next Steps

1. ✅ Deploy application
2. ✅ Import database schema
3. ✅ Test all functionality
4. ✅ Add your logo to `frontend/images/logo.png`
5. ✅ Configure custom domain (optional)
6. ✅ Set up monitoring and alerts

