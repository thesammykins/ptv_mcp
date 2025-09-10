#!/usr/bin/env bun

/**
 * Test route validation specifically to understand why NextTrain is not finding valid runs
 */

import { config } from './src/config';
import { PtvClient } from './src/ptv/client';
import { ROUTE_TYPE } from './src/ptv/types';

async function testRouteValidation() {
  console.log('🔍 Testing Route Validation Logic');
  console.log('=================================\n');
  
  if (!config.ptvDevId || !config.ptvApiKey) {
    console.error('❌ PTV credentials not configured');
    process.exit(1);
  }
  
  const client = new PtvClient();
  
  // Test the exact scenario: Flinders Street to Richmond
  const originName = 'Flinders Street';
  const destinationName = 'Richmond';
  
  console.log(`🚉 Testing: ${originName} → ${destinationName}\n`);
  
  try {
    // Step 1: Resolve stops
    const [originStops, destinationStops] = await Promise.all([
      client.findTrainStops(originName),
      client.findTrainStops(destinationName),
    ]);
    
    const originStop = originStops[0]!;
    const destinationStop = destinationStops[0]!;
    
    console.log(`✅ Origin: ${originStop.stop_name} (ID: ${originStop.stop_id})`);
    console.log(`✅ Destination: ${destinationStop.stop_name} (ID: ${destinationStop.stop_id})\n`);
    
    // Step 2: Find common routes (using similar logic to NextTrainTool)
    console.log('🛤️  Finding common routes...');
    const originRoutes = originStop.routes || [];
    const destRoutes = destinationStop.routes || [];
    
    const commonRoutes = originRoutes.filter(originRoute =>
      destRoutes.some(destRoute => destRoute.route_id === originRoute.route_id)
    ).filter(route => route.route_type === ROUTE_TYPE.TRAIN);
    
    if (commonRoutes.length === 0) {
      console.log('❌ No common routes found');
      return;
    }
    
    console.log(`✅ Found ${commonRoutes.length} common routes:`, commonRoutes.map(r => r.route_name));
    
    // Step 3: Test the first route in detail
    const testRoute = commonRoutes[0]!;
    console.log(`\n🔍 Testing route: ${testRoute.route_name} (ID: ${testRoute.route_id})\n`);
    
    // Get directions
    const directionsResult = await client.getDirectionsForRoute(testRoute.route_id!);
    const directions = directionsResult.directions || [];
    
    console.log(`📍 Found ${directions.length} directions:`, directions.map(d => d.direction_name));
    
    // Test each direction
    for (const direction of directions) {
      console.log(`\n🧭 Testing direction: ${direction.direction_name} (ID: ${direction.direction_id})`);
      
      // Get departures for this direction
      const departures = await client.getDepartures(
        ROUTE_TYPE.TRAIN,
        originStop.stop_id!,
        {
          route_id: testRoute.route_id!,
          direction_id: direction.direction_id,
          max_results: 3,
        }
      );
      
      if (!departures.departures || departures.departures.length === 0) {
        console.log(`   ⚠️  No departures found for this direction`);
        continue;
      }
      
      console.log(`   ✅ Found ${departures.departures.length} departures`);
      
      // Test first departure in detail
      const testDeparture = departures.departures[0]!;
      if (!testDeparture.run_ref) {
        console.log(`   ⚠️  No run_ref available`);
        continue;
      }
      
      console.log(`   🚂 Testing run: ${testDeparture.run_ref}`);
      console.log(`   ⏰ Departure: ${testDeparture.scheduled_departure_utc}`);
      
      // Test run pattern validation
      try {
        const runPattern = await client.getRunPattern(testDeparture.run_ref, ROUTE_TYPE.TRAIN, {
          stop_id: destinationStop.stop_id!,
        });
        
        console.log(`   📊 Run pattern response:`, {
          departures: runPattern.departures?.length || 0,
          runs: Object.keys(runPattern.runs || {}).length,
          routes: Object.keys(runPattern.routes || {}).length,
          stops: Object.keys(runPattern.stops || {}).length,
        });
        
        // Check if destination is served
        const servesDestination = runPattern.departures?.some(dep => dep.stop_id === destinationStop.stop_id!) || false;
        
        if (servesDestination) {
          console.log(`   ✅ SUCCESS: Run ${testDeparture.run_ref} serves destination!`);
          
          // Find the specific stop in the pattern
          const destinationDeparture = runPattern.departures?.find(dep => dep.stop_id === destinationStop.stop_id!);
          if (destinationDeparture) {
            console.log(`   📍 Destination departure: ${destinationDeparture.scheduled_departure_utc}`);
            
            // Calculate journey time
            const originTime = new Date(testDeparture.scheduled_departure_utc!);
            const destTime = new Date(destinationDeparture.scheduled_departure_utc!);
            const journeyMinutes = Math.round((destTime.getTime() - originTime.getTime()) / (1000 * 60));
            
            console.log(`   ⏱️  Journey time: ${journeyMinutes} minutes`);
            
            return; // Success! We found a valid run
          }
        } else {
          console.log(`   ❌ Run does not serve destination`);
          
          // Debug: show what stops it does serve
          if (runPattern.departures && runPattern.departures.length > 0) {
            console.log(`   🔍 Run serves ${runPattern.departures.length} stops:`, 
              runPattern.departures.slice(0, 5).map(d => 
                runPattern.stops?.[d.stop_id!.toString()]?.stop_name || `Stop ${d.stop_id}`
              ).join(', ') + (runPattern.departures.length > 5 ? '...' : '')
            );
          }
        }
      } catch (error: any) {
        console.log(`   ❌ Error getting run pattern:`, error.message);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

if (import.meta.main) {
  testRouteValidation().catch(console.error);
}
