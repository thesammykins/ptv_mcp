#!/usr/bin/env bun

/**
 * Test getRunPattern with different expand parameters to find the right one
 */

import { config } from './src/config';
import { PtvClient } from './src/ptv/client';
import { ROUTE_TYPE } from './src/ptv/types';

// Expand parameter constants (copied from client)
const EXPAND = {
  ALL: 0,
  STOP: 1,
  ROUTE: 2,
  RUN: 3,
  DIRECTION: 4,
  DISRUPTION: 5,
  VEHICLE_POSITION: 6,
  VEHICLE_DESCRIPTOR: 7,
} as const;

async function testExpandParameters() {
  console.log('🔍 Testing getRunPattern with different expand parameters');
  console.log('=========================================================\n');
  
  if (!config.ptvDevId || !config.ptvApiKey) {
    console.error('❌ PTV credentials not configured');
    process.exit(1);
  }
  
  const client = new PtvClient();
  
  try {
    // Get a run reference from departures
    console.log('🚉 Getting a run reference...\n');
    
    const originStops = await client.findTrainStops('Flinders Street');
    const originStop = originStops[0]!;
    
    const departures = await client.getDepartures(ROUTE_TYPE.TRAIN, originStop.stop_id!, {
      max_results: 5,
    });
    
    const testDeparture = departures.departures?.find(d => d.run_ref) || departures.departures?.[0]!;
    if (!testDeparture?.run_ref) {
      console.log('❌ No run_ref available');
      return;
    }
    
    console.log(`🚂 Testing run: ${testDeparture.run_ref}`);
    console.log(`⏰ Departure: ${testDeparture.scheduled_departure_utc}\n`);
    
    // Test different expand parameter combinations
    const expandTests = [
      {
        name: 'Current approach: [STOP, RUN, ROUTE]',
        expand: [EXPAND.STOP, EXPAND.RUN, EXPAND.ROUTE],
      },
      {
        name: 'ALL expansion',
        expand: [EXPAND.ALL],
      },
      {
        name: 'Individual: [STOP, RUN, ROUTE, DIRECTION]',
        expand: [EXPAND.STOP, EXPAND.RUN, EXPAND.ROUTE, EXPAND.DIRECTION],
      },
      {
        name: 'No expand parameters',
        expand: undefined,
      },
    ];
    
    for (const test of expandTests) {
      console.log(`📊 Testing: ${test.name}`);
      
      try {
        // Make direct API call instead of using client method to control expand exactly
        const url = `/v3/runs/${encodeURIComponent(testDeparture.run_ref)}/route_type/${ROUTE_TYPE.TRAIN}`;
        const params: any = {};
        
        if (test.expand) {
          params.expand = test.expand.join(',');
        }
        
        console.log(`   🔗 URL: ${url}`);
        console.log(`   📝 Params: ${JSON.stringify(params)}`);
        
        // Import ptvFetch directly
        const { ptvFetch } = await import('./src/ptv/http');
        const response = await ptvFetch<any>(url, params);
        
        console.log(`   ✅ Response:`, {
          departures: response.departures?.length || 0,
          runs: Object.keys(response.runs || {}).length,
          routes: Object.keys(response.routes || {}).length,
          stops: Object.keys(response.stops || {}).length,
          directions: Object.keys(response.directions || {}).length,
        });
        
        if (response.departures && response.departures.length > 0) {
          console.log(`   🎉 SUCCESS! Got ${response.departures.length} departures`);
          console.log(`   📍 First few stops:`);
          response.departures.slice(0, 5).forEach((dep: any, index: number) => {
            const stopName = response.stops?.[dep.stop_id?.toString()]?.stop_name || `Stop ${dep.stop_id}`;
            console.log(`      ${index + 1}. ${stopName} - ${dep.scheduled_departure_utc}`);
          });
          
          // This is the working approach - break here
          console.log('\n🎯 FOUND THE SOLUTION!\n');
          break;
        } else {
          console.log(`   ❌ No departures data`);
        }
        
      } catch (error: any) {
        console.log(`   💥 Error: ${error.message}`);
      }
      
      console.log(); // Empty line between tests
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

if (import.meta.main) {
  testExpandParameters().catch(console.error);
}
