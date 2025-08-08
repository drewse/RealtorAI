# Realtor Scraper - Cloud Run Deployment Guide

## ✅ Production-Ready Features

### 1. **Server Configuration**
- ✅ Listens on `process.env.PORT` (default 8080)
- ✅ Logs "✅ Server listening on port ..." message
- ✅ Binds to `0.0.0.0` for Cloud Run compatibility
- ✅ Graceful shutdown handling (SIGTERM, SIGINT)
- ✅ Server error handling

### 2. **API Endpoints**
- ✅ **GET /** - Health check endpoint
- ✅ **POST /** - Main scraping endpoint (accepts `{ text, userId }`)
- ✅ **POST /import** - Alias for backward compatibility
- ✅ **POST /importPropertyFromText** - Alias for backward compatibility

### 3. **Request Format**
```json
{
  "text": "https://www.realtor.ca/real-estate/12345/example-property",
  "userId": "test"
}
```

### 4. **Response Format**
```json
{
  "success": true,
  "partial": false,
  "missing": [],
  "source": "ld+json",
  "address": "123 Main St, Toronto, ON M5V 3A8",
  "addressLine1": "123 Main St",
  "city": "Toronto",
  "state": "ON",
  "postalCode": "M5V 3A8",
  "price": 899900,
  "bedrooms": 3,
  "bathrooms": 2,
  "description": "Beautiful property...",
  "images": ["https://...", "https://..."],
  "mlsNumber": "W1234567",
  "url": "https://www.realtor.ca/real-estate/12345/example-property",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 5. **Puppeteer Configuration**
- ✅ Optimized for Cloud Run environment
- ✅ Uses system Chrome from Puppeteer base image
- ✅ Comprehensive Chrome flags for containerized environment
- ✅ Proper resource cleanup in all error scenarios

### 6. **Error Handling**
- ✅ Always returns 200 status (never 4xx/5xx)
- ✅ Centralized `sendPartial()` function
- ✅ Comprehensive try-catch blocks
- ✅ Browser resource cleanup in all scenarios
- ✅ Express error handler for unhandled exceptions

### 7. **Docker Configuration**
- ✅ Production-optimized Dockerfile
- ✅ Uses Puppeteer base image
- ✅ Proper user permissions (pptruser)
- ✅ Health check endpoint
- ✅ Environment variables for production

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
  --concurrency 1
```

### Test Deployment
```bash
# Test health check
curl https://realtor-scraper-XXXXX-uc.a.run.app/

# Test scraping endpoint
curl -X POST "https://realtor-scraper-XXXXX-uc.a.run.app/" \
  -H "Content-Type: application/json" \
  --data '{"text":"https://www.realtor.ca/real-estate/12345/example-property","userId":"test"}'
```

## 🔧 Configuration

### Environment Variables
- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Environment (default: production)
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` - Skip Chromium download (true)
- `PUPPETEER_EXECUTABLE_PATH` - Chrome executable path

### Cloud Run Settings
- **Memory**: 2GB (recommended for Puppeteer)
- **CPU**: 2 vCPU (recommended for performance)
- **Timeout**: 300 seconds (5 minutes)
- **Concurrency**: 1 (to avoid resource conflicts)

## 🧪 Testing

### Local Testing
```bash
# Start the server
npm start

# In another terminal, test the endpoints
npm test
```

### Production Testing
```bash
# Test with curl
curl -X POST "https://YOUR-CLOUD-RUN-URL/" \
  -H "Content-Type: application/json" \
  --data '{"text":"https://www.realtor.ca/real-estate/12345/example-property","userId":"test"}'
```

## 📋 Pre-Deployment Checklist

- [ ] All files committed to repository
- [ ] Dockerfile builds successfully
- [ ] Local testing passes
- [ ] Environment variables configured
- [ ] Cloud Run service configured with proper resources
- [ ] Health check endpoint responds correctly
- [ ] POST endpoint accepts correct JSON format
- [ ] Error handling works as expected

## 🔍 Troubleshooting

### Common Issues
1. **Container fails to start**: Check Dockerfile and base image
2. **Puppeteer launch fails**: Verify Chrome executable path
3. **Memory issues**: Increase Cloud Run memory allocation
4. **Timeout errors**: Increase timeout or optimize scraping logic
5. **Permission errors**: Check user permissions in Dockerfile

### Logs
```bash
# View Cloud Run logs
gcloud logs read --service=realtor-scraper --limit=50
```

## 📝 Notes

- The scraper is hardened against malformed ld+json
- Multiple fallback extraction methods ensure data completeness
- All responses are JSON and always return 200 status
- Browser resources are properly cleaned up in all scenarios
- The service is production-ready for Cloud Run deployment 