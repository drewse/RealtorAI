# Cloud Run Deployment Checklist

## ✅ Pre-Deployment Verification

### 1. **File Structure**
- [ ] `index.js` - Main application file
- [ ] `package.json` - Dependencies and scripts
- [ ] `Dockerfile` - Container configuration
- [ ] `test-local.js` - Local testing script
- [ ] `verify-deployment.js` - Deployment verification script
- [ ] `DEPLOYMENT.md` - Deployment guide
- [ ] `DEPLOYMENT-CHECKLIST.md` - This checklist

### 2. **Package.json Verification**
- [ ] `node-fetch` moved to `dependencies` (not devDependencies)
- [ ] All required scripts present: `start`, `test`, `health`, `verify`
- [ ] Production dependencies only: `cors`, `express`, `puppeteer`, `node-fetch`

### 3. **Dockerfile Verification**
- [ ] Uses `ghcr.io/puppeteer/puppeteer:latest` base image
- [ ] Proper user switching (root → pptruser)
- [ ] Optimized layer caching (package.json copied first)
- [ ] Health check uses Node.js (not curl)
- [ ] Environment variables set correctly
- [ ] Proper permissions set for pptruser

### 4. **index.js Verification**
- [ ] Enhanced startup error handling
- [ ] Environment variable validation
- [ ] Dependency loading error handling
- [ ] Port validation
- [ ] Graceful shutdown handling
- [ ] Uncaught exception handling
- [ ] Server error handling
- [ ] Proper logging for Cloud Run

## 🚀 Deployment Commands

### Build and Deploy
```bash
# Navigate to scraper directory
cd realtor-scraper

# Build the container
docker build -t realtor-scraper .

# Deploy to Cloud Run
gcloud run deploy realtor-scraper \
  --image realtor-scraper \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --concurrency 1 \
  --port 8080
```

### Test Deployment
```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe realtor-scraper --region=us-central1 --format='value(status.url)')

# Test health check
curl $SERVICE_URL/

# Test scraping endpoint
curl -X POST "$SERVICE_URL/" \
  -H "Content-Type: application/json" \
  --data '{"text":"https://www.realtor.ca/real-estate/12345/example-property","userId":"test"}'

# Run comprehensive verification
TEST_URL=$SERVICE_URL npm run verify
```

## 🔧 Configuration

### Environment Variables
- `PORT=8080` (Cloud Run sets this automatically)
- `NODE_ENV=production`
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- `PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable`
- `PUPPETEER_CACHE_DIR=/app/.cache`

### Cloud Run Settings
- **Memory**: 2GB (required for Puppeteer)
- **CPU**: 2 vCPU (recommended for performance)
- **Timeout**: 300 seconds (5 minutes)
- **Concurrency**: 1 (to avoid resource conflicts)
- **Port**: 8080 (default)

## 🧪 Testing

### Local Testing
```bash
# Start the server
npm start

# In another terminal, test the endpoints
npm test

# Test health check
npm run health

# Run comprehensive verification
npm run verify
```

### Production Testing
```bash
# Test with curl
curl -X POST "https://YOUR-CLOUD-RUN-URL/" \
  -H "Content-Type: application/json" \
  --data '{"text":"https://www.realtor.ca/real-estate/12345/example-property","userId":"test"}'

# Run verification script
TEST_URL=https://YOUR-CLOUD-RUN-URL npm run verify
```

## 📋 Post-Deployment Checklist

### 1. **Health Check**
- [ ] `GET /` returns `{"ok": true}` with 200 status
- [ ] Health check passes in Cloud Run console
- [ ] Container starts within 30 seconds

### 2. **API Endpoints**
- [ ] `POST /` accepts `{ text, userId }` format
- [ ] `POST /import` works (backward compatibility)
- [ ] `POST /importPropertyFromText` works (backward compatibility)
- [ ] All endpoints return 200 status (never 4xx/5xx)

### 3. **Error Handling**
- [ ] Invalid requests return structured error responses
- [ ] Missing `text` field returns validation error
- [ ] Puppeteer errors are handled gracefully
- [ ] All responses are valid JSON

### 4. **Performance**
- [ ] Container starts quickly (< 30 seconds)
- [ ] Health checks respond quickly (< 5 seconds)
- [ ] Scraping requests complete within timeout
- [ ] Memory usage stays within limits

### 5. **Logging**
- [ ] Startup logs are visible in Cloud Run console
- [ ] Request logs show proper formatting
- [ ] Error logs include sufficient detail
- [ ] Health check logs are present

## 🔍 Troubleshooting

### Common Issues

1. **Container fails to start**
   - Check Dockerfile syntax
   - Verify base image availability
   - Check for missing dependencies

2. **Health check fails**
   - Verify PORT environment variable
   - Check if server binds to 0.0.0.0
   - Ensure health endpoint returns 200

3. **Puppeteer launch fails**
   - Verify PUPPETEER_EXECUTABLE_PATH
   - Check Chrome flags compatibility
   - Ensure proper permissions

4. **Memory issues**
   - Increase Cloud Run memory allocation
   - Check for memory leaks in code
   - Verify browser cleanup

5. **Timeout errors**
   - Increase Cloud Run timeout
   - Optimize scraping logic
   - Check network connectivity

### Logs
```bash
# View Cloud Run logs
gcloud logs read --service=realtor-scraper --region=us-central1 --limit=50

# Stream logs in real-time
gcloud logs tail --service=realtor-scraper --region=us-central1
```

## ✅ Success Criteria

The deployment is successful when:

1. **Container starts** within 30 seconds
2. **Health check passes** consistently
3. **All endpoints respond** with 200 status
4. **Error handling works** correctly
5. **Logging is comprehensive** and readable
6. **Performance is acceptable** for production use

## 📝 Notes

- The service is hardened against malformed ld+json
- Multiple fallback extraction methods ensure data completeness
- All responses are JSON and always return 200 status
- Browser resources are properly cleaned up in all scenarios
- The service is production-ready for Cloud Run deployment
- Backward compatibility is maintained for existing integrations 