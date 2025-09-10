#!/usr/bin/env bun

/**
 * Debug script to test PTV API endpoints directly
 */

import { config } from './src/config';
import { PtvClient } from './src/ptv/client';

async function debugAPI() {
  console.log('🧪 PTV API Debug Test');
  console.log('===================');
  
  if (!config.ptvDevId || !config.ptvApiKey) {
    console.log('❌ PTV credentials not configured');
    console.log('💡 Set PTV_DEV_ID and PTV_API_KEY environment variables');
    return;
  }
  
  console.log('✅ Credentials configured');
  console.log(`📡 Base URL: ${config.ptvBaseUrl}`);
  console.log(`🔐 Dev ID: ${config.ptvDevId}`);
  console.log(`⏱️  Timeout: ${config.httpTimeoutMs}ms`);
  console.log('');
  
  const client = new PtvClient();
  
  try {
    // Test 1: Search for Flinders Street
    console.log('🔍 Test 1: Searching for "Flinders Street"');
    const searchResult = await client.findTrainStops('Flinders Street');
    console.log(`   ✅ Found ${searchResult.length} train stops`);
    
    if (searchResult.length > 0) {
      const firstStop = searchResult[0];
      console.log(`   📍 First result: ${firstStop.stop_name} (ID: ${firstStop.stop_id})`);
      console.log(`   🚂 Route type: ${firstStop.route_type}`);
      console.log(`   📍 Location: ${firstStop.stop_latitude}, ${firstStop.stop_longitude}`);
      
      // Test 2: Get departures from this stop
      console.log('');
      console.log('🚂 Test 2: Getting departures from first stop');
      try {
        const departures = await client.getDepartures(0, firstStop.stop_id!, { max_results: 5 });
        console.log(`   ✅ Found ${departures.departures?.length || 0} departures`);
        
        if (departures.departures && departures.departures.length > 0) {
          const firstDeparture = departures.departures[0];
          console.log(`   🚂 Next departure: ${firstDeparture.scheduled_departure_utc}`);
          console.log(`   📍 Platform: ${firstDeparture.platform_number || 'TBC'}`);
          console.log(`   📋 Route ID: ${firstDeparture.route_id}`);
        }
        
        // Check if we have routes data
        if (departures.routes) {
          const routeCount = Object.keys(departures.routes).length;
          console.log(`   📋 Routes in response: ${routeCount}`);
        }
        
      } catch (departError) {
        console.error(`   ❌ Departures failed: ${departError.message}`);
      }
    }
    
    // Test 3: Search for South Morang 
    console.log('');
    console.log('🔍 Test 3: Searching for "South Morang"');
    const southMorangResult = await client.findTrainStops('South Morang');
    console.log(`   ✅ Found ${southMorangResult.length} train stops`);
    
    if (southMorangResult.length > 0) {
      const southMorang = southMorangResult[0];
      console.log(`   📍 First result: ${southMorang.stop_name} (ID: ${southMorang.stop_id})`);
    }
    
    // Test 4: Try to get routes
    console.log('');
    console.log('🛤️  Test 4: Getting all train routes');
    try {
      const routes = await client.getRoutes(0); // 0 = trains
      console.log(`   ✅ Found ${routes.routes?.length || 0} train routes`);
      
      if (routes.routes && routes.routes.length > 0) {
        const hurstbridgeRoute = routes.routes.find(r => 
          r.route_name?.toLowerCase().includes('hurstbridge')
        );
        if (hurstbridgeRoute) {
          console.log(`   🚂 Found Hurstbridge route: ${hurstbridgeRoute.route_name} (ID: ${hurstbridgeRoute.route_id})`);
        }
      }
    } catch (routeError) {
      console.error(`   ❌ Routes failed: ${routeError.message}`);
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.error('   Stack:', error.stack);
  }
}

if (import.meta.main) {
  debugAPI().catch(console.error);
}
