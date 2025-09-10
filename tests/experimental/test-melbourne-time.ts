#!/usr/bin/env bun

/**
 * Test Melbourne timezone utilities
 */

import {
  getMelbourneNow,
  getMelbourneNowUTC, 
  getMelbourneTimeForDisplay,
  parseUserTimeToMelbourneUTC,
  getMelbourneTimeInMinutes,
  getMelbourneTimeRange,
  formatUTCForMelbourne,
  isMelbourneDST,
  getMelbourneTimezoneOffset,
  getTimezoneDebugInfo
} from './src/utils/melbourne-time';

import { NextTrainTool } from './src/features/next_train/tool';
import { PtvClient } from './src/ptv/client';

async function testMelbourneTime() {
  console.log('🕐 Testing Melbourne Timezone Utilities');
  console.log('=======================================');
  
  // Test basic time functions
  console.log('📋 Basic Time Functions:');
  console.log(`   Melbourne now: ${getMelbourneTimeForDisplay()}`);
  console.log(`   Melbourne UTC: ${getMelbourneNowUTC()}`);
  console.log(`   DST active: ${isMelbourneDST()}`);
  console.log(`   Timezone: ${getMelbourneTimezoneOffset()}`);
  console.log('');
  
  // Test user time parsing
  console.log('🔧 User Time Parsing Tests:');
  const testTimes = [
    '2:30 PM',
    '14:30', 
    '9:00 AM',
    '2025-09-10T15:00:00Z',
    'invalid time',
    undefined
  ];
  
  testTimes.forEach(time => {
    const parsed = parseUserTimeToMelbourneUTC(time);
    const formatted = formatUTCForMelbourne(parsed);
    console.log(`   "${time || 'undefined'}" → ${parsed} → ${formatted}`);
  });
  console.log('');
  
  // Test time ranges
  console.log('📅 Time Range Tests:');
  const range60 = getMelbourneTimeRange(undefined, 60);
  console.log(`   Next 60 mins: ${formatUTCForMelbourne(range60.start)} to ${formatUTCForMelbourne(range60.end)}`);
  
  const range30 = getMelbourneTimeRange('2:00 PM', 30);
  console.log(`   2PM + 30 mins: ${formatUTCForMelbourne(range30.start)} to ${formatUTCForMelbourne(range30.end)}`);
  console.log('');
  
  // Test timezone debug info
  console.log('🔍 Debug Info:');
  const debugInfo = getTimezoneDebugInfo();
  Object.entries(debugInfo).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
  console.log('');
  
  // Test with NextTrain tool
  console.log('🚂 Testing NextTrain with Melbourne Time:');
  const client = new PtvClient();
  const nextTrainTool = new NextTrainTool(client);
  
  try {
    console.log('   Testing with current time (no time specified)...');
    const result1 = await nextTrainTool.execute({
      origin: 'Flinders Street',
      destination: 'Melbourne Central'
    });
    
    console.log(`   ✅ Success! Next train: ${result1.data.route?.name} at ${formatUTCForMelbourne(result1.data.departure?.scheduled!)}`);
    console.log(`   📊 Timezone info:`, result1.metadata.timezone);
    console.log('');
    
    // Test with user-specified time
    console.log('   Testing with user time "3:00 PM"...');
    const result2 = await nextTrainTool.execute({
      origin: 'Flinders Street', 
      destination: 'Melbourne Central',
      time: '3:00 PM'
    });
    
    console.log(`   ✅ Success! Next train: ${result2.data.route?.name} at ${formatUTCForMelbourne(result2.data.departure?.scheduled!)}`);
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

if (import.meta.main) {
  testMelbourneTime().catch(console.error);
}
