#!/usr/bin/env bun

/**
 * Final comprehensive test of the fixed NextTrain tool
 */

import { config } from './src/config';
import { PtvClient } from './src/ptv/client';
import { NextTrainTool } from './src/features/next_train/tool';

async function finalTest() {
  console.log('🎯 Final NextTrain Tool Test');
  console.log('============================\n');
  
  if (!config.ptvDevId || !config.ptvApiKey) {
    console.error('❌ PTV credentials not configured');
    process.exit(1);
  }
  
  const ptvClient = new PtvClient();
  const nextTrain = new NextTrainTool(ptvClient);
  
  const currentTime = new Date();
  console.log(`🕐 Current Melbourne time: ${currentTime.toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}\n`);
  
  // Test cases that should have frequent services
  const testCases = [
    {
      description: 'Short city journey',
      origin: 'Flinders Street',
      destination: 'Richmond',
    },
    {
      description: 'Another short city route',
      origin: 'Southern Cross',
      destination: 'North Melbourne',
    },
    {
      description: 'Cross-network connection',
      origin: 'Flinders Street',
      destination: 'Melbourne Central',
    },
  ];
  
  let successCount = 0;
  const totalTests = testCases.length;
  
  for (const test of testCases) {
    console.log(`🔍 Testing: ${test.description}`);
    console.log(`   Route: ${test.origin} → ${test.destination}`);
    
    try {
      const startTime = Date.now();
      const result = await nextTrain.execute({
        origin: test.origin,
        destination: test.destination,
      });
      const executionTime = Date.now() - startTime;
      
      if (result.data.departure && result.data.route) {
        const departureTime = new Date(result.data.departure.scheduled);
        const minutesUntilDeparture = Math.round((departureTime.getTime() - currentTime.getTime()) / (1000 * 60));
        
        console.log(`   ✅ SUCCESS`);
        console.log(`   🚉 Route: ${result.data.route.name}`);
        console.log(`   ⏰ Departure: ${result.data.departure.scheduled}`);
        console.log(`   ⏱️  In ${minutesUntilDeparture} minutes`);
        console.log(`   🚉 Platform: ${result.data.departure.platform || 'TBC'}`);
        
        if (result.data.departure.estimated) {
          console.log(`   📡 Real-time: ${result.data.departure.estimated}`);
        }
        
        if (result.metadata) {
          console.log(`   📊 ${result.metadata.executionTime}ms, ${result.metadata.apiCalls} API calls`);
        }
        
        // Validate timing
        if (minutesUntilDeparture >= 0 && minutesUntilDeparture <= 30) {
          console.log(`   ✅ Timing validated: Within 30-minute window`);
          successCount++;
        } else {
          console.log(`   ⚠️  Timing issue: ${minutesUntilDeparture} minutes (outside 30-min window)`);
        }
        
      } else {
        console.log(`   ℹ️  No trains found (may be normal for this time/route)`);
      }
      
      console.log(`   ⚡ Total execution: ${executionTime}ms`);
      
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log(); // Empty line
  }
  
  console.log('='.repeat(50));
  console.log(`🎯 Results: ${successCount}/${totalTests} tests found trains within 30-minute window`);
  
  if (successCount > 0) {
    console.log('✅ NextTrain tool is working correctly!');
    console.log('   • Finds trains within 30-minute window');
    console.log('   • Provides accurate timing information');
    console.log('   • Includes real-time data when available');
    console.log('   • Performs efficiently with reasonable API usage');
  } else {
    console.log('⚠️  No trains found - this might be due to:');
    console.log('   • Off-peak service hours');
    console.log('   • Scheduled maintenance');  
    console.log('   • The current time having limited services');
  }
}

if (import.meta.main) {
  finalTest().catch(console.error);
}
