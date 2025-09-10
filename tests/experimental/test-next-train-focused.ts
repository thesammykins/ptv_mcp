#!/usr/bin/env bun

/**
 * Focused test for the next-train tool to verify it finds trains within 30 minutes
 * and correctly identifies the "next" train from the available options.
 */

import { config } from './src/config';
import { PtvClient } from './src/ptv/client';
import { NextTrainTool } from './src/features/next_train/tool';

async function testNextTrainLogic() {
  console.log('🚂 Testing Next Train Tool - 30 Minute Window Logic');
  console.log('====================================================\n');
  
  if (!config.ptvDevId || !config.ptvApiKey) {
    console.error('❌ PTV credentials not configured');
    process.exit(1);
  }
  
  const ptvClient = new PtvClient();
  const nextTrain = new NextTrainTool(ptvClient);
  
  const currentTime = new Date();
  console.log(`🕐 Current time: ${currentTime.toISOString()}`);
  console.log(`📅 Melbourne time: ${currentTime.toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}\n`);
  
  // Test scenarios focusing on timing logic
  const testCases = [
    {
      description: 'Major city route (should have frequent services)',
      origin: 'Flinders Street',
      destination: 'Richmond',
      expectedResult: 'Should find a train within 30 minutes'
    },
    {
      description: 'Busy suburban route',
      origin: 'Southern Cross',
      destination: 'Footscray',
      expectedResult: 'Should find next available train'
    },
    {
      description: 'Cross-city connection',
      origin: 'Melbourne Central',
      destination: 'South Yarra',
      expectedResult: 'May require route changes, should find best option'
    }
  ];
  
  for (const test of testCases) {
    console.log(`🔍 Test: ${test.description}`);
    console.log(`   From: ${test.origin} → ${test.destination}`);
    console.log(`   Expected: ${test.expectedResult}`);
    
    try {
      const startTime = Date.now();
      const result = await nextTrain.execute({
        origin: test.origin,
        destination: test.destination
      });
      const executionTime = Date.now() - startTime;
      
      if (result.data.departure) {
        const departure = result.data.departure;
        const departureTime = new Date(departure.scheduled);
        const minutesUntilDeparture = Math.round((departureTime.getTime() - currentTime.getTime()) / (1000 * 60));
        
        console.log(`   ✅ SUCCESS: Found next train`);
        console.log(`   🚉 Route: ${result.data.route.name} line`);
        console.log(`   ⏰ Departure: ${departure.scheduled}`);
        console.log(`   ⏱️ Minutes until departure: ${minutesUntilDeparture} min`);
        console.log(`   🚉 Platform: ${departure.platform || 'TBC'}`);
        
        if (departure.estimated) {
          console.log(`   📡 Real-time: ${departure.estimated}`);
        }
        
        // Verify it's within 30 minutes
        if (minutesUntilDeparture <= 30 && minutesUntilDeparture >= 0) {
          console.log(`   ✅ TIMING OK: Within 30-minute window`);
        } else if (minutesUntilDeparture < 0) {
          console.log(`   ⚠️ TIMING: Train already departed (${Math.abs(minutesUntilDeparture)} min ago)`);
        } else {
          console.log(`   ⚠️ TIMING: Beyond 30-minute window (${minutesUntilDeparture} min away)`);
        }
        
        // Check metadata
        if (result.metadata) {
          console.log(`   📊 Performance: ${result.metadata.executionTime}ms, ${result.metadata.apiCalls} API calls`);
          console.log(`   🗂️ Cache hits: ${result.metadata.cacheHit ? 'Yes' : 'No'}`);
        }
        
      } else {
        console.log(`   ℹ️ NO TRAINS: No departures found within time window`);
        console.log(`   💡 This might be normal during off-peak hours`);
      }
      
      console.log(`   ⚡ Execution time: ${executionTime}ms`);
      
    } catch (error: any) {
      console.log(`   ❌ ERROR: ${error.message}`);
      if (error.code) {
        console.log(`   🔍 Error code: ${error.code}`);
      }
    }
    
    console.log(); // Empty line between tests
  }
  
  // Test with specific time parameter
  console.log('🔍 Test: With specific future time (30 minutes from now)');
  const futureTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
  console.log(`   Target time: ${futureTime.toISOString()}`);
  
  try {
    const result = await nextTrain.execute({
      origin: 'Flinders Street',
      destination: 'South Morang',
      time: futureTime.toISOString()
    });
    
    if (result.data.departure) {
      const departureTime = new Date(result.data.departure.scheduled);
      const minutesFromTarget = Math.round((departureTime.getTime() - futureTime.getTime()) / (1000 * 60));
      
      console.log(`   ✅ Found train for future time`);
      console.log(`   ⏰ Departure: ${result.data.departure.scheduled}`);
      console.log(`   ⏱️ Minutes from target time: ${minutesFromTarget} min`);
    } else {
      console.log(`   ℹ️ No trains found for specified future time`);
    }
  } catch (error: any) {
    console.log(`   ❌ Future time test failed: ${error.message}`);
  }
}

if (import.meta.main) {
  testNextTrainLogic().catch(console.error);
}
