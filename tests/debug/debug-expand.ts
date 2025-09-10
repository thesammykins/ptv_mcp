#!/usr/bin/env bun

/**
 * Debug the exact expand parameter being sent to PTV API
 */

import { buildSignedPath } from './src/ptv/signing';
import { config } from './src/config';
import { ROUTE_TYPE } from './src/ptv/types';

async function debugExpand() {
  console.log('🔍 Debugging Expand Parameter');
  console.log('============================');
  
  // Manual expand constants to match exactly what PTV expects
  const EXPAND = {
    ALL: 0,
    STOP: 1, 
    ROUTE: 2,
    RUN: 3,
    DIRECTION: 4,
    DISRUPTION: 5,
    VEHICLE_POSITION: 6,
    VEHICLE_DESCRIPTOR: 7,
  };
  
  console.log('📋 Expand constants:');
  Object.entries(EXPAND).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
  console.log('');
  
  // Test different expand parameter combinations
  const testCases = [
    {
      name: 'Current (RUN,ROUTE,DIRECTION,STOP,DISRUPTION)',
      expand: [EXPAND.RUN, EXPAND.ROUTE, EXPAND.DIRECTION, EXPAND.STOP, EXPAND.DISRUPTION].join(',')
    },
    {
      name: 'All expansion',
      expand: EXPAND.ALL.toString()
    },
    {
      name: 'Just Route and Direction',
      expand: [EXPAND.ROUTE, EXPAND.DIRECTION].join(',')
    },
    {
      name: 'Individual test: Route only',
      expand: EXPAND.ROUTE.toString()
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`🧪 Test: ${testCase.name}`);
    
    const params = {
      route_id: 3, // Craigieburn
      direction_id: 1,
      max_results: 3,
      expand: testCase.expand
    };
    
    console.log(`   Params:`, params);
    
    const { pathWithQuery, signature } = buildSignedPath(
      '/v3/departures/route_type/0/stop/1071',
      params,
      config.ptvDevId,
      config.ptvApiKey
    );
    
    const fullUrl = `${config.ptvBaseUrl}${pathWithQuery}&signature=${signature}`;
    console.log(`   URL: ${fullUrl}`);
    console.log('');
    
    // Make the actual API call to test
    try {
      const response = await fetch(fullUrl);
      if (!response.ok) {
        console.log(`   ❌ HTTP ${response.status}: ${response.statusText}`);
      } else {
        const data = await response.json();
        console.log(`   ✅ Success! Analyzing response:`);
        console.log(`      Departures: ${data.departures?.length || 0}`);
        console.log(`      Routes keys: [${Object.keys(data.routes || {}).join(', ')}]`);
        console.log(`      Directions keys: [${Object.keys(data.directions || {}).join(', ')}]`);
        console.log(`      Runs keys: ${Object.keys(data.runs || {}).length} total`);
        
        // If we have routes, show the first one
        const routeKeys = Object.keys(data.routes || {});
        if (routeKeys.length > 0) {
          const firstRouteKey = routeKeys[0];
          const routeData = data.routes[firstRouteKey];
          console.log(`      Route ${firstRouteKey}:`, routeData?.route_name);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');
  }
}

if (import.meta.main) {
  debugExpand().catch(console.error);
}
