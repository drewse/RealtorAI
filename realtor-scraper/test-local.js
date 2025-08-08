const fetch = require('node-fetch');

async function testScraper() {
  const testUrl = 'http://localhost:8080/';
  
  console.log('🧪 Testing scraper locally...');
  
  try {
    // Test health check
    console.log('1. Testing health check...');
    const healthResponse = await fetch(testUrl);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test POST endpoint
    console.log('2. Testing POST endpoint...');
    const postResponse = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'https://www.realtor.ca/real-estate/12345/example-property',
        userId: 'test'
      })
    });
    
    const postData = await postResponse.json();
    console.log('✅ POST response status:', postResponse.status);
    console.log('✅ POST response:', JSON.stringify(postData, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testScraper();
}

module.exports = { testScraper }; 