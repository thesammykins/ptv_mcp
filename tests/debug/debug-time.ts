#!/usr/bin/env bun

/**
 * Debug script to check time handling and available departures
 */

import { PtvClient } from './src/ptv/client';
import { ROUTE_TYPE } from './src/ptv/types';

async function debugTimeHandling() {
  console.log('🕐 PTV API Time Debugging');
  console.log('========================');
  
  const client = new PtvClient();
  
  // Current times
  const now = new Date();
  const nowUTC = now.toISOString();
  const nowMelbourne = now.toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' });
  
  console.log('⏰ Current Times:');
  console.log(`   System UTC: ${nowUTC}`);
  console.log(`   Melbourne:  ${nowMelbourne}`);
  console.log(`   Unix time:  ${now.getTime()}`);
  console.log('');
  
  // Melbourne timezone calculation
  const melbourneOffset = 11; // AEDT UTC+11 (or UTC+10 for standard time)
  const melbourneTime = new Date(now.getTime() + (melbourneOffset * 60 * 60 * 1000));
  console.log(`   Melbourne calc: ${melbourneTime.toISOString()} (UTC+${melbourneOffset})`);
  console.log('');
  
  try {
    // Test 1: Get departures with current time
    console.log('🚂 Test 1: Departures with current UTC time');
    const departures1 = await client.getDepartures(ROUTE_TYPE.TRAIN, 1071, { 
      max_results: 10,
      date_utc: nowUTC
    });
    
    console.log(`   API called with: ${nowUTC}`);
    console.log(`   Found ${departures1.departures?.length || 0} departures`);
    
    if (departures1.departures && departures1.departures.length > 0) {
      const firstDep = departures1.departures[0];
      console.log(`   Next departure: ${firstDep.scheduled_departure_utc}`);
      console.log(`   Platform: ${firstDep.platform_number || 'TBC'}`);
    }
    console.log('');
    
    // Test 2: Get departures WITHOUT date_utc (let API use default)
    console.log('🚂 Test 2: Departures with default time (no date_utc)');
    const departures2 = await client.getDepartures(ROUTE_TYPE.TRAIN, 1071, { 
      max_results: 10
      // No date_utc parameter
    });
    
    console.log(`   API called with: default (server time)`);
    console.log(`   Found ${departures2.departures?.length || 0} departures`);
    
    if (departures2.departures && departures2.departures.length > 0) {
      const firstDep = departures2.departures[0];
      console.log(`   Next departure: ${firstDep.scheduled_departure_utc}`);
      console.log(`   Platform: ${firstDep.platform_number || 'TBC'}`);
    }
    console.log('');
    
    // Test 3: Try a time range (30 minutes ago to 4 hours from now)
    console.log('🚂 Test 3: Departures with past time (30 min ago)');
    const pastTime = new Date(now.getTime() - (30 * 60 * 1000)); // 30 minutes ago
    const departures3 = await client.getDepartures(ROUTE_TYPE.TRAIN, 1071, { 
      max_results: 20,
      date_utc: pastTime.toISOString()
    });
    
    console.log(`   API called with: ${pastTime.toISOString()} (30 min ago)`);
    console.log(`   Found ${departures3.departures?.length || 0} departures`);
    
    if (departures3.departures && departures3.departures.length > 0) {
      const firstDep = departures3.departures[0];
      console.log(`   First departure: ${firstDep.scheduled_departure_utc}`);
      console.log(`   Platform: ${firstDep.platform_number || 'TBC'}`);
      
      // Show first 5 departures with times
      console.log('   Next 5 departures:');
      departures3.departures.slice(0, 5).forEach((dep, i) => {
        const depTime = new Date(dep.scheduled_departure_utc!);
        const depMelbourne = depTime.toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' });
        console.log(`     ${i+1}. ${dep.scheduled_departure_utc} (${depMelbourne} Melbourne)`);
      });
    }
    console.log('');
    
    // Test 4: Future time
    console.log('🚂 Test 4: Departures with future time (2 hours from now)');
    const futureTime = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // 2 hours from now
    const departures4 = await client.getDepartures(ROUTE_TYPE.TRAIN, 1071, { 
      max_results: 10,
      date_utc: futureTime.toISOString()
    });
    
    console.log(`   API called with: ${futureTime.toISOString()} (2 hours future)`);
    console.log(`   Found ${departures4.departures?.length || 0} departures`);
    
    if (departures4.departures && departures4.departures.length > 0) {
      const firstDep = departures4.departures[0];
      console.log(`   Next departure: ${firstDep.scheduled_departure_utc}`);
      console.log(`   Platform: ${firstDep.platform_number || 'TBC'}`);
    }
    
  } catch (error) {
    console.error('❌ Time debugging failed:', error.message);
  }
  
  console.log('');
  console.log('💡 Analysis:');
  console.log('   - PTV API expects UTC timestamps');
  console.log('   - Departure times are returned in UTC');
  console.log('   - Need to check if current system time is correct');
  console.log('   - Melbourne is UTC+11 (AEDT) or UTC+10 (AEST)');
}

if (import.meta.main) {
  debugTimeHandling().catch(console.error);
}
