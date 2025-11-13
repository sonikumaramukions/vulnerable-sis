# Logo Upload Guide for Azure Deployment

## How to Upload Logo to Azure

### Method 1: Upload via Git (Recommended)

1. **Place your logo file:**
   ```bash
   # Copy your logo to the images directory
   cp /path/to/your/logo.png vulnerable-sis/frontend/images/logo.png
   ```

2. **Commit and push:**
   ```bash
   cd vulnerable-sis
   git add frontend/images/logo.png
   git commit -m "Add TRIPATHI GROUP logo"
   git push azure main
   ```

### Method 2: Upload via Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your App Service
3. Go to **Development Tools** → **Advanced Tools (Kudu)** → **Go**
4. Click **Debug console** → **CMD**
5. Navigate to: `site/wwwroot/frontend/images/`
6. Click **+** button and upload `logo.png`

### Method 3: Upload via Azure CLI

```bash
# Upload logo file
az webapp deploy \
  --resource-group rg-tripathi-sis \
  --name tripathi-sis-app \
  --src-path frontend/images/logo.png \
  --target-path frontend/images/logo.png \
  --type static
```

### Method 4: Use Azure Storage (For Large Files)

If your logo is large, consider using Azure Blob Storage:

1. Create a Storage Account
2. Upload logo to Blob Storage
3. Update HTML to use Blob Storage URL:
   ```html
   <img src="https://yourstorageaccount.blob.core.windows.net/images/logo.png" alt="Logo">
   ```

## Verify Logo Upload

After uploading, verify the logo is accessible:

```bash
# Get your app URL
APP_URL=$(az webapp show \
  --resource-group rg-tripathi-sis \
  --name tripathi-sis-app \
  --query defaultHostName -o tsv)

# Test logo URL
curl -I https://$APP_URL/images/logo.png
```

Should return `200 OK` if logo is uploaded correctly.

## Logo Requirements

- **File name:** Must be exactly `logo.png`
- **Location:** `frontend/images/logo.png`
- **Recommended size:** 200x200px to 500x500px
- **Format:** PNG (with transparency) or JPG
- **File size:** Under 1MB recommended

## Troubleshooting

### Logo Not Showing

1. **Check file path:**
   ```bash
   # SSH into Azure App Service
   az webapp ssh --resource-group rg-tripathi-sis --name tripathi-sis-app
   ls -la site/wwwroot/frontend/images/
   ```

2. **Check file permissions:**
   ```bash
   chmod 644 site/wwwroot/frontend/images/logo.png
   ```

3. **Verify static file serving:**
   - Check `app.js` has: `app.use(express.static(path.join(__dirname, '../frontend')))`
   - Restart app: `az webapp restart --name tripathi-sis-app --resource-group rg-tripathi-sis`

4. **Check browser console:**
   - Open browser DevTools (F12)
   - Check Network tab for 404 errors on logo.png

### Logo Shows Broken Image

- Verify file format is PNG or JPG
- Check file is not corrupted
- Ensure file name is exactly `logo.png` (case-sensitive)

### Logo Too Large/Small

Update CSS in `frontend/css/styles.css`:

```css
.login-header img {
    max-width: 200px;  /* Adjust as needed */
    max-height: 100px; /* Adjust as needed */
}

.dashboard-header img {
    max-height: 50px;  /* Adjust as needed */
}
```

## Quick Test

After deployment, test logo:

```bash
# Get app URL
APP_URL=$(az webapp show --resource-group rg-tripathi-sis --name tripathi-sis-app --query defaultHostName -o tsv)

# Open in browser
echo "Test logo at: https://$APP_URL/images/logo.png"
```

Open the URL in your browser to verify the logo displays correctly.

