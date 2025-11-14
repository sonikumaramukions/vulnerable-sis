# GitHub Actions Azure Deployment Setup

## ✅ What's Been Fixed

1. **GitHub Actions Workflow Created**: `.github/workflows/azure-deploy.yml`
   - Automatically deploys to Azure on push to `main` branch
   - Uses Node.js 20 (compatible with Azure App Service)
   - Properly installs dependencies using `npm ci`

2. **Dependency Issues Fixed**:
   - Updated `package.json` to use flexible Node.js version (`>=18.0.0`)
   - Verified all dependencies install correctly
   - Fixed package-lock.json

## 🔧 Required Setup Before First Deployment

### Step 1: Get Azure Publish Profile

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your App Service: `tripathi-sis-app`
3. Click on **"Get publish profile"** (in the Overview section)
4. Download the `.PublishSettings` file
5. Open the file and copy its contents

### Step 2: Add Secret to GitHub

1. Go to your GitHub repository: `https://github.com/sonikumaramukions/vulnerable-sis`
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
5. Value: Paste the entire contents of the `.PublishSettings` file
6. Click **"Add secret"**

### Step 3: Update Workflow (if needed)

If your Azure App Service name is different from `tripathi-sis-app`, edit:
- File: `.github/workflows/azure-deploy.yml`
- Line 10: Change `AZURE_WEBAPP_NAME: tripathi-sis-app` to your app name

## 🚀 Deployment

Once the secret is added:

1. **Automatic**: Every push to `main` branch will trigger deployment
2. **Manual**: Go to **Actions** tab → Select workflow → **Run workflow**

## 📋 Workflow Details

The workflow:
- ✅ Checks out your code
- ✅ Sets up Node.js 20
- ✅ Installs dependencies using `npm ci` (faster, more reliable)
- ✅ Verifies installation
- ✅ Deploys to Azure App Service

## 🔍 Troubleshooting

### Workflow Fails with "Publish Profile Not Found"
- Make sure you've added the `AZURE_WEBAPP_PUBLISH_PROFILE` secret
- Verify the secret name matches exactly (case-sensitive)

### Dependency Installation Errors
- Check that `package-lock.json` is committed
- Verify Node.js version compatibility
- Check workflow logs in GitHub Actions tab

### Deployment Fails
- Verify your Azure App Service is running
- Check Azure App Service logs: `az webapp log tail`
- Ensure the app name in workflow matches your Azure App Service name

## 📝 Next Steps

1. ✅ Add the `AZURE_WEBAPP_PUBLISH_PROFILE` secret to GitHub
2. ✅ Push to `main` branch (or manually trigger workflow)
3. ✅ Monitor deployment in GitHub Actions tab
4. ✅ Verify app is running on Azure

