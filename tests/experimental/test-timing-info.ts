#!/usr/bin/env bun

/**
 * Test the updated NextTrain tool with timing information
 */

import { config } from './src/config';
import { PtvClient } from './src/ptv/client';
import { NextTrainTool } from './src/features/next_train/tool';

async function testTimingInfo() {
  console.log('🕐 Testing NextTrain with Timing Information');
  console.log('============================================\n');
  
  if (!config.ptvDevId || !config.ptvApiKey) {
    console.error('❌ PTV credentials not configured');
    process.exit(1);
  }
  
  const ptvClient = new PtvClient();
  const nextTrain = new NextTrainTool(ptvClient);
  
  console.log('🚉 Testing: Flinders Street → Richmond\n');
  
  try {
    const result = await nextTrain.execute({
      origin: 'Flinders Street',
      destination: 'Richmond',
    });
    
    console.log('✅ NextTrain response with timing information:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.data.departure) {
      console.log('\n📊 Key Timing Information:');
      console.log(`   🕐 Current Melbourne Time: ${result.data.timing?.currentTime}`);
      console.log(`   🚂 Scheduled Departure (Melbourne): ${result.data.departure.scheduledMelbourneTime}`);
      console.log(`   ⏱️  Minutes Until Departure: ${result.data.departure.minutesUntilDeparture} minutes`);
      console.log(`   ✅ Within 30-Minute Window: ${result.data.timing?.within30MinuteWindow ? 'YES' : 'NO'}`);
      
      if (result.data.departure.estimatedMelbourneTime) {
        console.log(`   📡 Real-Time Departure (Melbourne): ${result.data.departure.estimatedMelbourneTime}`);
      }
    }
    
    console.log('\n🎯 This now provides clear timing context to avoid UTC/Melbourne timezone confusion!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

if (import.meta.main) {
  testTimingInfo().catch(console.error);
}
