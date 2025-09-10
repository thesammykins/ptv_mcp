#!/usr/bin/env bun

/**
 * Test script to verify the MCP tools through the server interface
 */

import { NextTrainTool } from './src/features/next_train/tool';
import { LineTimetableTool } from './src/features/line_timetable/tool';
import { HowFarTool } from './src/features/how_far/tool';
import { PtvClient } from './src/ptv/client';

async function testMCPToolsWithConfig() {
  console.log('🧪 MCP Tools Test (Using Production Config)');
  console.log('============================================');

  // Check if we can access credentials through process.env
  const devId = process.env.PTV_DEV_ID;
  const apiKey = process.env.PTV_API_KEY;

  if (!devId || !apiKey) {
    console.log('❌ Environment variables not set');
    console.log('   Let\'s check what\'s available in process.env:');
    
    const relevantEnvVars = Object.keys(process.env).filter(key => 
      key.includes('PTV') || key.includes('ptv') || key.includes('API') || key.includes('DEV')
    );
    
    if (relevantEnvVars.length > 0) {
      console.log('   Found related env vars:', relevantEnvVars);
      relevantEnvVars.forEach(key => {
        const value = process.env[key];
        const masked = value && value.length > 8 ? value.substring(0, 4) + '****' + value.substring(value.length - 4) : value;
        console.log(`   ${key}=${masked}`);
      });
    } else {
      console.log('   No relevant environment variables found');
    }
    
    console.log('');
    console.log('💡 To test with real credentials, set:');
    console.log('   export PTV_DEV_ID="your_dev_id"');
    console.log('   export PTV_API_KEY="your_api_key"');
    console.log('   then run this script again');
    return;
  }

  console.log('✅ Credentials found in environment');
  console.log(`📡 Dev ID: ${devId.substring(0, 6)}****`);
  console.log(`🔐 API Key: ${apiKey.substring(0, 8)}****`);
  console.log('');

  try {
    const client = new PtvClient();
    
    // Test 1: NextTrain tool
    console.log('🚂 Testing NextTrain tool');
    const nextTrainTool = new NextTrainTool(client);
    
    try {
      const result = await nextTrainTool.execute({
        origin: 'Flinders Street',
        destination: 'South Morang'
      });
      
      console.log('   ✅ NextTrain success!');
      console.log(`   🚂 Route: ${result.data.route.name}`);
      console.log(`   📅 Departure: ${result.data.departure.scheduled}`);
      console.log(`   📍 Platform: ${result.data.departure.platform || 'TBC'}`);
    } catch (error) {
      console.error('   ❌ NextTrain failed:', error.message);
    }

    console.log('');

    // Test 2: LineTimetable tool
    console.log('🕐 Testing LineTimetable tool');
    const lineTimetableTool = new LineTimetableTool(client);
    
    try {
      const result = await lineTimetableTool.execute({
        stop: 'Flinders Street',
        route: 'Hurstbridge',
        durationMinutes: 60
      });
      
      console.log('   ✅ LineTimetable success!');
      console.log(`   🚂 Found ${result.data.departures.length} departures`);
      if (result.data.departures.length > 0) {
        console.log(`   📅 Next: ${result.data.departures[0].scheduled}`);
      }
    } catch (error) {
      console.error('   ❌ LineTimetable failed:', error.message);
    }

    console.log('');

    // Test 3: HowFar tool
    console.log('📏 Testing HowFar tool');
    const howFarTool = new HowFarTool(client);
    
    try {
      const result = await howFarTool.execute({
        route: 'Hurstbridge',
        stop: 'Flinders Street'
      });
      
      console.log('   ✅ HowFar success!');
      console.log(`   🚂 Found ${result.data.approachingTrains.length} approaching train(s)`);
      if (result.data.approachingTrains.length > 0) {
        const train = result.data.approachingTrains[0];
        console.log(`   📏 Distance: ${Math.round(train.distanceMeters)}m`);
        console.log(`   ⏰ ETA: ${train.eta.toFixed(1)} minutes`);
      }
    } catch (error) {
      console.error('   ❌ HowFar failed:', error.message);
    }

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

if (import.meta.main) {
  testMCPToolsWithConfig().catch(console.error);
}
