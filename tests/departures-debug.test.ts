/**
 * Departures Debug Test
 * 
 * Debug the actual structure returned by the departures endpoint when trying
 * to find stopping patterns for specific runs.
 */

import { PtvClient } from '../src/ptv/client';
// Skip if no credentials available

describe('Departures Endpoint Debug', () => {
  let ptvClient: PtvClient;

  const skipIfNoCredentials = () => {
    if (!process.env.PTV_DEV_ID || !process.env.PTV_API_KEY) {
      console.warn('⚠️ Skipping test - PTV API credentials not available');
      return true;
    }
    return false;
  };

  beforeAll(async () => {
    if (!skipIfNoCredentials()) {
      console.log('🔧 Setting up departures debug test...');
      ptvClient = new PtvClient();
    }
  });

  test('should debug the new getRunPattern approach', async () => {
    if (skipIfNoCredentials()) return;
    
    console.log('🔍 Testing the new departures-based approach...');
    
    const runRef = '9737';
    const routeType = 3;
    const originStopId = 1509; // Bendigo Railway Station
    const interchangeStopId = 1181; // Southern Cross Station
    
    console.log(`📍 Testing run: ${runRef}, route type: ${routeType}`);
    console.log(`📍 Origin stop: ${originStopId}, Interchange: ${interchangeStopId}`);
    
    try {
      // Test our new getRunPattern method
      const pattern = await ptvClient.getRunPattern(runRef, routeType, {
        expand: [1, 2, 3], // STOP, ROUTE, RUN
        stop_id: originStopId
      });
      
      console.log('📊 Pattern Response Structure:');
      console.log('Keys:', Object.keys(pattern));
      console.log('Departures count:', pattern.departures?.length || 0);
      console.log('Stops count:', Object.keys(pattern.stops || {}).length);
      console.log('Routes count:', Object.keys(pattern.routes || {}).length);
      
      if (pattern.departures && pattern.departures.length > 0) {
        console.log('\n🚉 First few departures:');
        pattern.departures.slice(0, 5).forEach((dep, idx) => {
          console.log(`   ${idx + 1}: Stop ${dep.stop_id}, Run ${dep.run_ref}, Time: ${dep.scheduled_departure_utc}`);
        });
        
        // Look for our specific run
        const ourRun = pattern.departures.find(dep => dep.run_ref === runRef);
        if (ourRun) {
          console.log(`\n✅ Found our run ${runRef}:`);
          console.log(`   Stop ID: ${ourRun.stop_id}`);
          console.log(`   Departure: ${ourRun.scheduled_departure_utc}`);
          console.log(`   Platform: ${ourRun.platform_number || 'N/A'}`);
        } else {
          console.log(`\n❌ Our run ${runRef} NOT found in departures`);
        }
        
        // Look for Southern Cross departures for our run
        const southernCrossDeps = pattern.departures.filter(dep => 
          dep.run_ref === runRef && dep.stop_id === interchangeStopId
        );
        
        if (southernCrossDeps.length > 0) {
          console.log(`\n🎯 Found ${southernCrossDeps.length} Southern Cross departure(s) for our run:`);
          southernCrossDeps.forEach(dep => {
            console.log(`   Time: ${dep.scheduled_departure_utc}, Platform: ${dep.platform_number || 'N/A'}`);
          });
        } else {
          console.log(`\n❌ No Southern Cross departures found for run ${runRef}`);
          
          // Let's see what stops are actually in the pattern
          const uniqueStops = [...new Set(pattern.departures.map(dep => dep.stop_id))];
          console.log(`\n📊 Unique stops in pattern: ${uniqueStops.length}`);
          console.log('   Stop IDs:', uniqueStops.slice(0, 10));
          
          // Check stops metadata
          if (pattern.stops) {
            console.log(`\n🚉 Stops metadata available: ${Object.keys(pattern.stops).length} stops`);
            const stopNames = Object.entries(pattern.stops).slice(0, 5).map(([id, stop]: [string, any]) => 
              `${id}: ${stop.stop_name}`
            );
            console.log('   First few stops:', stopNames);
            
            // Check if Southern Cross is in the stops metadata
            const southernCrossStop = pattern.stops[interchangeStopId.toString()];
            if (southernCrossStop) {
              console.log(`\n✅ Southern Cross in stops metadata: ${(southernCrossStop as any).stop_name}`);
            } else {
              console.log(`\n❌ Southern Cross (${interchangeStopId}) NOT in stops metadata`);
            }
          }
        }
        
      } else {
        console.log('❌ No departures in pattern response');
      }
      
    } catch (error: any) {
      console.error('❌ Pattern retrieval failed:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }, 30000);

  test('should debug what happens when we query the wrong direction', async () => {
    if (skipIfNoCredentials()) return;
    
    console.log('🔍 Testing: Could we be querying the wrong direction/route?');
    
    const runRef = '9737';
    const routeType = 3;
    
    try {
      // First get run metadata to understand route and direction
      const { ptvFetch } = await import('../src/ptv/http');
      const runMetadata = await ptvFetch<any>(`/v3/runs/${runRef}/route_type/${routeType}`);
      
      console.log('📊 Run Metadata:');
      if (runMetadata.runs?.[0]) {
        const run = runMetadata.runs[0];
        console.log('   Route ID:', run.route_id);
        console.log('   Direction ID:', run.direction_id);
        console.log('   Final Stop ID:', run.final_stop_id);
        console.log('   Destination:', run.destination_name);
        
        // Now try to get departures from the final destination going backwards
        if (run.final_stop_id) {
          console.log(`\n🔄 Trying departures from destination (${run.final_stop_id}) backwards...`);
          
          const backwardsPattern = await ptvClient.getDepartures(
            routeType,
            run.final_stop_id,
            {
              route_id: run.route_id,
              max_results: 50,
              expand: [0], // ALL
              look_backwards: true
            }
          );
          
          console.log('📊 Backwards Pattern:');
          console.log('   Departures count:', backwardsPattern.departures?.length || 0);
          
          if (backwardsPattern.departures) {
            const ourRunDeps = backwardsPattern.departures.filter(dep => dep.run_ref === runRef);
            console.log(`   Our run departures: ${ourRunDeps.length}`);
            
            if (ourRunDeps.length > 0) {
              console.log('   Stop IDs for our run:', ourRunDeps.map(dep => dep.stop_id));
            }
          }
        }
      }
      
    } catch (error: any) {
      console.error('❌ Backwards pattern test failed:', error.message);
    }
  }, 30000);
});