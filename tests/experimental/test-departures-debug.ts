#!/usr/bin/env bun

/**
 * Debug script to examine what departures are actually being returned
 * and understand the 30-minute window filtering issue.
 */

import { config } from './src/config';
import { PtvClient } from './src/ptv/client';
import { ROUTE_TYPE } from './src/ptv/types';

async function debugDepartures() {
  console.log('🔍 Debugging Departures Data');
  console.log('============================\n');
  
  if (!config.ptvDevId || !config.ptvApiKey) {
    console.error('❌ PTV credentials not configured');
    process.exit(1);
  }
  
  const client = new PtvClient();
  
  // Test a major station with frequent services
  const stopName = 'Flinders Street';
  console.log(`🚉 Testing departures from: ${stopName}`);
  
  try {
    // Step 1: Find the stop
    const stops = await client.findTrainStops(stopName);
    if (stops.length === 0) {
      console.log('❌ Stop not found');
      return;
    }
    
    const stop = stops[0]!;
    console.log(`✅ Found stop: ${stop.stop_name} (ID: ${stop.stop_id})`);
    
    // Step 2: Get departures without any filtering
    console.log(`\n🚂 Getting departures (max 20)...`);
    
    const currentTime = new Date();
    console.log(`🕐 Current Melbourne time: ${currentTime.toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}`);
    
    const departures = await client.getDepartures(
      ROUTE_TYPE.TRAIN,
      stop.stop_id!,
      { 
        max_results: 20,
        include_cancelled: false
      }
    );
    
    if (!departures.departures || departures.departures.length === 0) {
      console.log('❌ No departures found');
      return;
    }
    
    console.log(`✅ Found ${departures.departures.length} departures:`);
    
    // Step 3: Analyze the departures
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    
    console.log(`📅 Time window: ${now.toISOString()} → ${thirtyMinutesFromNow.toISOString()}`);
    console.log(`📅 Melbourne time window: ${now.toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })} → ${thirtyMinutesFromNow.toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}\n`);
    
    let departuresWithinWindow = 0;
    
    departures.departures.forEach((departure, index) => {
      if (!departure.scheduled_departure_utc) return;
      
      const departureTime = new Date(departure.scheduled_departure_utc);
      const minutesUntilDeparture = Math.round((departureTime.getTime() - now.getTime()) / (1000 * 60));
      const withinWindow = minutesUntilDeparture >= 0 && minutesUntilDeparture <= 30;
      
      if (withinWindow) departuresWithinWindow++;
      
      // Get route info
      const routeName = departure.route_id && departures.routes ? 
        departures.routes[departure.route_id.toString()]?.route_name : 
        'Unknown Route';
      
      const directionName = departure.direction_id && departures.directions ?
        departures.directions[departure.direction_id.toString()]?.direction_name :
        'Unknown Direction';
      
      const status = withinWindow ? '✅' : (minutesUntilDeparture < 0 ? '🕰️' : '⏰');
      
      console.log(`${status} ${index + 1}. ${routeName} → ${directionName}`);
      console.log(`    ⏰ Scheduled: ${departure.scheduled_departure_utc}`);
      console.log(`    🕐 Melbourne:  ${departureTime.toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}`);
      console.log(`    ⏱️  Minutes from now: ${minutesUntilDeparture} min`);
      console.log(`    🚉 Platform: ${departure.platform_number || 'TBC'}`);
      
      if (departure.estimated_departure_utc && departure.estimated_departure_utc !== departure.scheduled_departure_utc) {
        const estimatedTime = new Date(departure.estimated_departure_utc);
        console.log(`    📡 Real-time: ${departure.estimated_departure_utc} (${estimatedTime.toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })})`);
      }
      
      console.log();
    });
    
    console.log(`📊 Summary:`);
    console.log(`   Total departures: ${departures.departures.length}`);
    console.log(`   Within 30-minute window: ${departuresWithinWindow}`);
    console.log(`   Routes available: ${Object.keys(departures.routes || {}).length}`);
    console.log(`   Directions available: ${Object.keys(departures.directions || {}).length}`);
    
    // Step 4: Test with different route
    if (departuresWithinWindow === 0) {
      console.log(`\n🔍 Testing another major station for comparison...`);
      
      const altStops = await client.findTrainStops('Southern Cross');
      if (altStops.length > 0) {
        const altStop = altStops[0]!;
        console.log(`🚉 ${altStop.stop_name} (ID: ${altStop.stop_id})`);
        
        const altDepartures = await client.getDepartures(
          ROUTE_TYPE.TRAIN,
          altStop.stop_id!,
          { max_results: 10 }
        );
        
        if (altDepartures.departures && altDepartures.departures.length > 0) {
          const nextDep = altDepartures.departures[0]!;
          const nextDepTime = new Date(nextDep.scheduled_departure_utc!);
          const minsAway = Math.round((nextDepTime.getTime() - now.getTime()) / (1000 * 60));
          
          console.log(`   Next departure: ${minsAway} minutes away`);
          console.log(`   Time: ${nextDep.scheduled_departure_utc} (${nextDepTime.toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })})`);
        } else {
          console.log(`   No departures found either`);
        }
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

if (import.meta.main) {
  debugDepartures().catch(console.error);
}
