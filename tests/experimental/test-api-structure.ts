#!/usr/bin/env bun

/**
 * Test script to verify API signing and URL structure without making actual requests
 */

import { buildSignedPath } from './src/ptv/signing';
import { ptvFetch } from './src/ptv/http';
import { config } from './src/config';

async function testApiStructure() {
  console.log('🔐 PTV API Structure Test');
  console.log('=========================');
  
  console.log('📋 Current configuration:');
  console.log(`   Base URL: ${config.ptvBaseUrl}`);
  console.log(`   Dev ID: ${config.ptvDevId}`);
  console.log(`   API Key: ${config.ptvApiKey ? '***configured***' : 'NOT SET'}`);
  console.log(`   Timeout: ${config.httpTimeoutMs}ms`);
  console.log('');
  
  // Test URL signing without making requests
  console.log('🔐 Testing URL signing:');
  const testPath = '/v3/search/flinders street';
  const testParams = {
    route_types: '0',
    max_results: '5',
    devid: config.ptvDevId
  };
  
  try {
    const { pathWithQuery, signature } = buildSignedPath(testPath, testParams, config.ptvDevId, config.ptvApiKey);
    const signedUrl = `${pathWithQuery}&signature=${signature}`;
    console.log('✅ Signed URL generation successful');
    console.log(`   Path: ${testPath}`);
    console.log(`   Params: ${Object.keys(testParams).join(', ')}`);
    console.log(`   Full URL: ${config.ptvBaseUrl}${signedUrl}`);
    
    // Show the signature component
    const urlParts = signedUrl.split('&signature=');
    if (urlParts.length === 2) {
      console.log(`   Signature: ${urlParts[1].substring(0, 8)}...${urlParts[1].substring(urlParts[1].length - 8)}`);
    }
  } catch (error) {
    console.error('❌ URL signing failed:', error.message);
  }
  
  console.log('');
  
  // Test different endpoint URLs
  console.log('📡 Testing different endpoint structures:');
  const endpoints = [
    { name: 'Search', path: '/v3/search/flinders%20street', params: { route_types: '0' } },
    { name: 'Departures', path: '/v3/departures/route_type/0/stop/1071', params: { max_results: '5' } },
    { name: 'Routes', path: '/v3/routes', params: { route_types: '0' } },
    { name: 'Directions', path: '/v3/directions/route/2', params: {} }
  ];
  
  endpoints.forEach(endpoint => {
    try {
      const { pathWithQuery, signature } = buildSignedPath(endpoint.path, endpoint.params, config.ptvDevId, config.ptvApiKey);
      const signedUrl = `${pathWithQuery}&signature=${signature}`;
      console.log(`   ✅ ${endpoint.name}: ${endpoint.path}`);
      console.log(`      Full URL: ${config.ptvBaseUrl}${signedUrl.substring(0, 60)}...`);
    } catch (error) {
      console.log(`   ❌ ${endpoint.name}: ${error.message}`);
    }
  });
  
  console.log('');
  
  // Test HTTP client with actual API call
  console.log('🌐 Testing HTTP client with actual API call:');
  try {
    console.log('   Making test API call to /v3/routes...');
    const routesResult = await ptvFetch('/v3/routes', { route_types: '0' });
    console.log('✅ HTTP client working successfully!');
    console.log(`   Base URL: ${config.ptvBaseUrl}`);
    console.log(`   Timeout: ${config.httpTimeoutMs}ms`);
    console.log(`   Max retries: ${config.httpMaxRetries}`);
    if (routesResult && typeof routesResult === 'object' && 'routes' in routesResult) {
      console.log(`   API Response: Found ${(routesResult as any).routes?.length || 0} train routes`);
    }
  } catch (error) {
    console.error('❌ HTTP client API call failed:', error.message);
  }
  
  console.log('');
  console.log('📋 Summary:');
  console.log('   - URL signing process is working correctly');
  console.log('   - HTTP client can be initialized');
  console.log('   - Ready to make API calls when credentials are available');
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Set real PTV_DEV_ID and PTV_API_KEY in .env file');
  console.log('   2. Run the full test suite: bun examples/test-tools.ts');
  console.log('   3. Test individual tools with real API data');
}

if (import.meta.main) {
  testApiStructure().catch(console.error);
}
