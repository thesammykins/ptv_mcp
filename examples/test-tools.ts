#!/usr/bin/env bun

/**
 * Example script demonstrating how to test all three PTV MCP tools locally.
 * 
 * This script initializes the PTV client and demonstrates each tool:
 * - next-train: Find next train between stations
 * - line-timetable: Get upcoming departures for a route
 * - how-far: Track approaching trains with real-time positions
 * 
 * To run: bun examples/test-tools.ts
 * 
 * Make sure to set PTV_DEV_ID and PTV_API_KEY in your .env file first.
 */

import { config } from '../src/config';
import { PtvClient } from '../src/ptv/client';
import { NextTrainTool } from '../src/features/next_train/tool';
import { LineTimetableTool } from '../src/features/line_timetable/tool';
import { HowFarTool } from '../src/features/how_far/tool';

async function main() {
  console.log('🚂 PTV MCP Tools Test Script');
  console.log('================================\n');

  // Check configuration
  if (!config.ptvDevId || !config.ptvApiKey) {
    console.error('❌ Error: PTV_DEV_ID and PTV_API_KEY must be set in .env file');
    console.error('💡 Copy .env.example to .env and add your credentials');
    process.exit(1);
  }

  console.log('✅ Configuration loaded successfully');
  console.log(`📡 Using PTV API base URL: ${config.ptvBaseUrl}\n`);

  // Initialize PTV client
  const ptvClient = new PtvClient();
  
  // Initialize tools
  const nextTrainTool = new NextTrainTool(ptvClient);
  const lineTimetableTool = new LineTimetableTool(ptvClient);
  const howFarTool = new HowFarTool(ptvClient);

  console.log('🔧 Testing PTV API connectivity...');
  try {
    // Test basic connectivity with a search
    const testStops = await ptvClient.searchStops('flinders street');
    console.log(`✅ API connectivity OK - found ${testStops.length} stops\n`);
  } catch (error) {
    console.error('❌ API connectivity failed:', error);
    console.error('💡 Check your PTV_DEV_ID and PTV_API_KEY are correct');
    process.exit(1);
  }

  let successCount = 0;
  let totalTests = 3;

  // Test 1: Next Train Tool
  console.log('🔍 Test 1: Next Train Tool');
  console.log('---------------------------');
  try {
    const nextTrainResult = await nextTrainTool.execute({
      origin: 'Flinders Street',
      destination: 'South Morang'
    });
    
    console.log('✅ Next train result:');
    if (nextTrainResult.data.departure) {
      console.log(`   🚂 Route: ${nextTrainResult.data.route.name}`);
      console.log(`   ⏰ Departure: ${nextTrainResult.data.departure.scheduled}`);
      console.log(`   🚉 Platform: ${nextTrainResult.data.departure.platform || 'TBC'}`);
    }
    console.log(`   📊 Metadata: ${nextTrainResult.metadata?.executionTime}ms, ${nextTrainResult.metadata?.apiCalls} API calls`);
    console.log();
    successCount++;
  } catch (error) {
    console.error('❌ Next train test failed:', error);
    console.log();
  }

  // Test 2: Line Timetable Tool
  console.log('📅 Test 2: Line Timetable Tool');
  console.log('-------------------------------');
  try {
    const timetableResult = await lineTimetableTool.execute({
      stop: 'Flinders Street',
      route: 'Hurstbridge',
      direction: 'Up'
    });
    
    console.log('✅ Line timetable result:');
    console.log(`   🚉 Stop: ${timetableResult.data.stop.name}`);
    console.log(`   🚂 Route: ${timetableResult.data.route.name}`);
    console.log(`   📋 Found ${timetableResult.data.departures.length} departures`);
    if (timetableResult.data.departures.length > 0) {
      const next = timetableResult.data.departures[0];
      console.log(`   ⏰ Next: ${next.scheduled} (Platform ${next.platform || 'TBC'})`);
    }
    console.log(`   📊 Metadata: ${timetableResult.metadata?.executionTime}ms`);
    console.log();
    successCount++;
  } catch (error) {
    console.error('❌ Line timetable test failed:', error);
    console.log();
  }

  // Test 3: How Far Tool
  console.log('📍 Test 3: How Far Tool');
  console.log('------------------------');
  try {
    const howFarResult = await howFarTool.execute({
      stop: 'Melbourne Central',
      route: 'Craigieburn',
      direction: 'inbound'
    });
    
    console.log('✅ How far result:');
    console.log(`   🚉 Stop: ${howFarResult.data.stop.name}`);
    if (howFarResult.data.approaching) {
      const train = howFarResult.data.approaching;
      console.log(`   🚂 Approaching: ${train.destination}`);
      if (train.realTimePosition) {
        console.log(`   📍 Distance: ${train.realTimePosition.distanceMeters}m`);
        console.log(`   ⏱️  ETA: ${train.realTimePosition.etaMinutes} minutes`);
        console.log(`   📡 Data: ${train.realTimePosition.accuracy}`);
      }
      if (train.vehicle) {
        console.log(`   🚋 Vehicle: ${train.vehicle.description}`);
      }
    } else {
      console.log('   ℹ️  No approaching trains detected');
    }
    console.log(`   📊 Source: ${howFarResult.metadata?.dataSource}`);
    console.log();
    successCount++;
  } catch (error) {
    console.error('❌ How far test failed:', error);
    console.log();
  }

  // Performance summary
  console.log('📊 Test Summary');
  console.log('================');
  console.log(`✅ ${successCount}/${totalTests} tests passed`);
  
  if (successCount === totalTests) {
    console.log('🎉 All tools working correctly!');
    console.log('\n💡 Tips:');
    console.log('   - Use these examples as templates for your own queries');
    console.log('   - Try different station names, routes, and directions');
    console.log('   - Check the JSON responses for all available data fields');
  } else {
    console.log('⚠️  Some tools failed - check error messages above');
    process.exit(1);
  }
}

// Run the tests
if (import.meta.main) {
  main().catch(console.error);
}
