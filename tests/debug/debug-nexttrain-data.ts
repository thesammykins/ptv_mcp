#!/usr/bin/env bun

/**
 * Debug the exact data structure in NextTrain tool
 */

import { PtvClient } from './src/ptv/client';
import { ROUTE_TYPE } from './src/ptv/types';

async function debugNextTrainData() {
  console.log('🔍 Debugging NextTrain Data Structure');
  console.log('=====================================');
  
  const client = new PtvClient();
  
  try {
    // Step 1: Get Flinders Street and Melbourne Central
    console.log('📍 Step 1: Resolving stops');
    const [originStops, destStops] = await Promise.all([
      client.findTrainStops('Flinders Street'),
      client.findTrainStops('Melbourne Central'),
    ]);
    
    const origin = originStops[0];
    const dest = destStops[0]; 
    console.log(`   Origin: ${origin.stop_name} (${origin.stop_id})`);
    console.log(`   Dest: ${dest.stop_name} (${dest.stop_id})`);
    
    // Step 2: Find a common route (use Craigieburn - should definitely connect these)
    console.log('\n🛤️  Step 2: Testing with Craigieburn route');
    const routes = await client.getRoutes(ROUTE_TYPE.TRAIN);
    const craigieburn = routes.routes?.find(r => r.route_name?.includes('Craigieburn'));
    
    if (!craigieburn) {
      console.log('❌ Craigieburn route not found');
      return;
    }
    
    console.log(`   Route: ${craigieburn.route_name} (${craigieburn.route_id})`);
    
    // Step 3: Get directions for this route
    console.log('\n🧭 Step 3: Getting directions');
    const directions = await client.getDirectionsForRoute(craigieburn.route_id!);
    console.log(`   Found ${directions.directions?.length || 0} directions:`, 
                directions.directions?.map(d => d.direction_name));
    
    if (!directions.directions || directions.directions.length === 0) {
      console.log('❌ No directions found');
      return;
    }
    
    // Step 4: Get departures with FULL debugging
    console.log('\n🚂 Step 4: Getting departures from Flinders St');
    const direction = directions.directions[0]; // Use first direction
    
    const departureOptions = {
      route_id: craigieburn.route_id!,
      direction_id: direction.direction_id,
      max_results: 3,
    };
    
    console.log('   Departure options:', departureOptions);
    
    const departures = await client.getDepartures(
      ROUTE_TYPE.TRAIN,
      origin.stop_id!,
      departureOptions
    );
    
    console.log(`\n📊 Step 5: Analyzing response structure`);
    console.log(`   Departures found: ${departures.departures?.length || 0}`);
    console.log(`   Routes keys: ${Object.keys(departures.routes || {})}`);
    console.log(`   Directions keys: ${Object.keys(departures.directions || {})}`);
    console.log(`   Runs keys: ${Object.keys(departures.runs || {}).slice(0, 3)}...`);
    
    if (departures.departures && departures.departures.length > 0) {
      const firstDep = departures.departures[0];
      console.log(`\n🚂 First departure:`, {
        scheduled: firstDep.scheduled_departure_utc,
        platform: firstDep.platform_number,
        run_ref: firstDep.run_ref,
        route_id: firstDep.route_id,
        direction_id: firstDep.direction_id
      });
      
      // Check what's in the routes object
      const routeKey = craigieburn.route_id!.toString();
      const routeData = departures.routes?.[routeKey];
      console.log(`\n🔍 Route data for key '${routeKey}':`, routeData);
      
      // Check directions
      const directionKey = direction.direction_id.toString();
      const directionData = departures.directions?.[directionKey];
      console.log(`\n🧭 Direction data for key '${directionKey}':`, directionData);
      
      // Check runs
      if (firstDep.run_ref) {
        const runData = departures.runs?.[firstDep.run_ref];
        console.log(`\n🏃 Run data for key '${firstDep.run_ref}':`, runData);
      }
      
      // Try to construct the return object like NextTrain does
      console.log(`\n🔧 Testing object construction:`);
      try {
        const testObject = {
          departure: firstDep,
          route: departures.routes![routeKey]!,
          direction: departures.directions![directionKey]!,
          run: departures.runs![firstDep.run_ref!]!,
        };
        console.log('✅ Object construction successful!');
        console.log('   Route name:', testObject.route?.route_name);
        console.log('   Direction name:', testObject.direction?.direction_name);
        console.log('   Run destination:', testObject.run?.destination_name);
      } catch (error) {
        console.log('❌ Object construction failed:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

if (import.meta.main) {
  debugNextTrainData().catch(console.error);
}
