const http = require('http');

async function verifyDeployment() {
  const baseUrl = process.env.TEST_URL || 'http://localhost:8080';
  const tests = [];
  
  console.log('🧪 Verifying Cloud Run deployment...');
  console.log(`📍 Testing URL: ${baseUrl}`);
  
  // Test 1: Health Check
  tests.push(async () => {
    console.log('\n1️⃣ Testing health check endpoint...');
    try {
      const response = await makeRequest(`${baseUrl}/`, 'GET');
      if (response.statusCode === 200 && response.data.ok === true) {
        console.log('✅ Health check passed');
        return true;
      } else {
        console.log('❌ Health check failed:', response.data);
        return false;
      }
    } catch (error) {
      console.log('❌ Health check error:', error.message);
      return false;
    }
  });
  
  // Test 2: POST endpoint with valid data
  tests.push(async () => {
    console.log('\n2️⃣ Testing POST endpoint with valid data...');
    try {
      const testData = {
        text: 'https://www.realtor.ca/real-estate/12345/example-property',
        userId: 'test-user'
      };
      
      const response = await makeRequest(`${baseUrl}/`, 'POST', testData);
      if (response.statusCode === 200 && response.data.success !== undefined) {
        console.log('✅ POST endpoint working');
        console.log('📊 Response:', {
          success: response.data.success,
          partial: response.data.partial,
          source: response.data.source,
          missing: response.data.missing
        });
        return true;
      } else {
        console.log('❌ POST endpoint failed:', response.data);
        return false;
      }
    } catch (error) {
      console.log('❌ POST endpoint error:', error.message);
      return false;
    }
  });
  
  // Test 3: POST endpoint with invalid data
  tests.push(async () => {
    console.log('\n3️⃣ Testing POST endpoint with invalid data...');
    try {
      const testData = { userId: 'test-user' }; // Missing text field
      
      const response = await makeRequest(`${baseUrl}/`, 'POST', testData);
      if (response.statusCode === 200 && response.data.source === 'validation-error') {
        console.log('✅ Error handling working correctly');
        return true;
      } else {
        console.log('❌ Error handling failed:', response.data);
        return false;
      }
    } catch (error) {
      console.log('❌ Error handling test failed:', error.message);
      return false;
    }
  });
  
  // Test 4: Backward compatibility routes
  tests.push(async () => {
    console.log('\n4️⃣ Testing backward compatibility routes...');
    const routes = ['/import', '/importPropertyFromText'];
    let allPassed = true;
    
    for (const route of routes) {
      try {
        const testData = {
          text: 'https://www.realtor.ca/real-estate/12345/example-property',
          userId: 'test-user'
        };
        
        const response = await makeRequest(`${baseUrl}${route}`, 'POST', testData);
        if (response.statusCode === 200) {
          console.log(`✅ Route ${route} working`);
        } else {
          console.log(`❌ Route ${route} failed`);
          allPassed = false;
        }
      } catch (error) {
        console.log(`❌ Route ${route} error:`, error.message);
        allPassed = false;
      }
    }
    
    return allPassed;
  });
  
  // Run all tests
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (let i = 0; i < tests.length; i++) {
    const result = await tests[i]();
    if (result) passedTests++;
  }
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Deployment is ready.');
    process.exit(0);
  } else {
    console.log('\n⚠️ Some tests failed. Please check the deployment.');
    process.exit(1);
  }
}

function makeRequest(url, method, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(url).hostname,
      port: new URL(url).port || (new URL(url).protocol === 'https:' ? 443 : 80),
      path: new URL(url).pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Deployment-Verifier/1.0'
      }
    };
    
    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsedBody = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedBody
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Run verification if this file is executed directly
if (require.main === module) {
  verifyDeployment().catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
}

module.exports = { verifyDeployment, makeRequest }; 