#!/usr/bin/env bun

/**
 * Test NextTrain with direct routes that should definitely work
 */

import { NextTrainTool } from './src/features/next_train/tool';
import { PtvClient } from './src/ptv/client';

async function testDirectRoutes() {
  console.log('🚂 Testing NextTrain with Direct Routes');
  console.log('=======================================');
  
  const client = new PtvClient();
  const nextTrainTool = new NextTrainTool(client);
  
  // Test cases for routes we know exist and are direct
  const testCases = [
    {
      name: 'Flinders St → Melbourne Central (City Circle)',
      origin: 'Flinders Street',
      destination: 'Melbourne Central'
    },
    {
      name: 'Flinders St → Richmond (Most lines go through)',
      origin: 'Flinders Street', 
      destination: 'Richmond'
    },
    {
      name: 'Flinders St → Jolimont (Near city, most lines)',
      origin: 'Flinders Street',
      destination: 'Jolimont'
    },
    {
      name: 'Richmond → East Richmond (Same line, consecutive)',
      origin: 'Richmond',
      destination: 'East Richmond'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    console.log('-'.repeat(50));
    
    try {
      const result = await nextTrainTool.execute({
        origin: testCase.origin,
        destination: testCase.destination
      });
      
      console.log('✅ SUCCESS!');
      console.log(`   Route: ${result.data.route?.name}`);
      console.log(`   Direction: ${result.data.direction?.name}`);
      console.log(`   Departure: ${result.data.departure?.scheduled}`);
      console.log(`   Platform: ${result.data.departure?.platform || 'TBC'}`);
      console.log(`   Origin: ${result.data.origin?.name} (${result.data.origin?.id})`);
      console.log(`   Destination: ${result.data.destination?.name} (${result.data.destination?.id})`);
      console.log(`   API Calls: ${result.metadata.apiCalls}`);
      
    } catch (error) {
      console.log('❌ FAILED:', error.message);
      console.log(`   Code: ${error.code || 'unknown'}`);
    }
  }
  
  console.log('\n💡 Analysis:');
  console.log('   - Testing direct routes to isolate the connection logic issue');
  console.log('   - If these work, the problem is with complex route connections');
  console.log('   - If these fail, the issue is in departure validation or time filtering');
}

if (import.meta.main) {
  testDirectRoutes().catch(console.error);
}
