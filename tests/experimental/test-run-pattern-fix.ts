#!/usr/bin/env bun

/**
 * Test getRunPattern without stop_id filter to see all stops in the run
 */

import { config } from './src/config';
import { PtvClient } from './src/ptv/client';
import { ROUTE_TYPE } from './src/ptv/types';

async function testRunPatternFix() {
  console.log('🔍 Testing getRunPattern without stop_id filter');
  console.log('==============================================\n');
  
  if (!config.ptvDevId || !config.ptvApiKey) {
    console.error('❌ PTV credentials not configured');
    process.exit(1);
  }
  
  const client = new PtvClient();
  
  try {
    // Get a specific run reference from departures
    const originName = 'Flinders Street';
    const destinationName = 'Richmond';
    
    console.log(`🚉 Getting run reference from ${originName}...\n`);
    
    const originStops = await client.findTrainStops(originName);
    const originStop = originStops[0]!;
    
    // Get some departures to get run references
    const departures = await client.getDepartures(ROUTE_TYPE.TRAIN, originStop.stop_id!, {
      max_results: 5,
    });
    
    if (!departures.departures || departures.departures.length === 0) {
      console.log('❌ No departures found');
      return;
    }
    
    const testDeparture = departures.departures.find(d => d.run_ref) || departures.departures[0]!;
    if (!testDeparture.run_ref) {
      console.log('❌ No run_ref available');
      return;
    }
    
    console.log(`🚂 Testing run: ${testDeparture.run_ref}`);
    console.log(`⏰ Departure: ${testDeparture.scheduled_departure_utc}`);
    
    // Get route name
    const routeName = testDeparture.route_id && departures.routes ?
      departures.routes[testDeparture.route_id.toString()]?.route_name : 
      'Unknown Route';
    console.log(`🛤️  Route: ${routeName}\n`);
    
    // Test 1: Call getRunPattern WITHOUT stop_id filter
    console.log('📊 Test 1: getRunPattern WITHOUT stop_id filter');
    const runPatternFull = await client.getRunPattern(testDeparture.run_ref, ROUTE_TYPE.TRAIN, {
      // No stop_id parameter - get all stops
    });
    
    console.log(`   ✅ Full pattern response:`, {
      departures: runPatternFull.departures?.length || 0,
      runs: Object.keys(runPatternFull.runs || {}).length,
      routes: Object.keys(runPatternFull.routes || {}).length,
      stops: Object.keys(runPatternFull.stops || {}).length,
    });
    
    if (runPatternFull.departures && runPatternFull.departures.length > 0) {
      console.log(`   📍 First 10 stops on this run:`);
      runPatternFull.departures.slice(0, 10).forEach((dep, index) => {
        const stopName = runPatternFull.stops?.[dep.stop_id!.toString()]?.stop_name || `Stop ${dep.stop_id}`;
        const time = dep.scheduled_departure_utc || 'No time';
        console.log(`      ${index + 1}. ${stopName} (${dep.stop_id}) - ${time}`);
      });
      
      // Check if destination is served
      const destinationStops = await client.findTrainStops(destinationName);
      const destinationStop = destinationStops[0]!;
      
      const servesDestination = runPatternFull.departures.some(dep => dep.stop_id === destinationStop.stop_id);
      console.log(`\n   🎯 Does this run serve ${destinationName}? ${servesDestination ? '✅ YES' : '❌ NO'}`);
      
      if (servesDestination) {
        const destinationDep = runPatternFull.departures.find(dep => dep.stop_id === destinationStop.stop_id);
        console.log(`   📍 ${destinationName} departure: ${destinationDep?.scheduled_departure_utc}`);
        
        // Calculate journey time
        const originTime = new Date(testDeparture.scheduled_departure_utc!);
        const destTime = new Date(destinationDep!.scheduled_departure_utc!);
        const journeyMinutes = Math.round((destTime.getTime() - originTime.getTime()) / (1000 * 60));
        
        console.log(`   ⏱️  Journey time: ${journeyMinutes} minutes`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    
    // Test 2: Call getRunPattern WITH stop_id filter (current approach)
    console.log('📊 Test 2: getRunPattern WITH stop_id filter (current broken approach)');
    const destinationStops = await client.findTrainStops(destinationName);
    const destinationStop = destinationStops[0]!;
    
    const runPatternFiltered = await client.getRunPattern(testDeparture.run_ref, ROUTE_TYPE.TRAIN, {
      stop_id: destinationStop.stop_id!, // This might be causing the issue
    });
    
    console.log(`   ❌ Filtered pattern response:`, {
      departures: runPatternFiltered.departures?.length || 0,
      runs: Object.keys(runPatternFiltered.runs || {}).length,
      routes: Object.keys(runPatternFiltered.routes || {}).length,
      stops: Object.keys(runPatternFiltered.stops || {}).length,
    });
    
    console.log('\n🎯 CONCLUSION:');
    console.log('   The issue is that using stop_id as a filter in getRunPattern');
    console.log('   is not returning departure data. We should call without the filter');
    console.log('   and then check if the destination is in the full list of stops.');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

if (import.meta.main) {
  testRunPatternFix().catch(console.error);
}
