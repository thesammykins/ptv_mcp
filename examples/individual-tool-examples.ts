#!/usr/bin/env bun

/**
 * Individual tool examples showing various usage patterns and parameters.
 * 
 * This demonstrates different ways to call each tool with various parameters
 * to showcase the flexibility and capabilities of the PTV MCP server.
 * 
 * Run: bun examples/individual-tool-examples.ts
 */

import { config } from '../src/config';
import { PtvClient } from '../src/ptv/client';
import { NextTrainTool } from '../src/features/next_train/tool';
import { LineTimetableTool } from '../src/features/line_timetable/tool';
import { HowFarTool } from '../src/features/how_far/tool';

async function runNextTrainExamples() {
  console.log('🚂 Next Train Tool Examples');
  console.log('=============================\n');
  
  const ptvClient = new PtvClient();
  const nextTrain = new NextTrainTool(ptvClient);
  
  const examples = [
    {
      description: 'City to outer suburb',
      params: { origin: 'Flinders Street', destination: 'South Morang' }
    },
    {
      description: 'Cross-city journey',
      params: { origin: 'Southern Cross', destination: 'Box Hill' }
    },
    {
      description: 'With specific departure time',
      params: { 
        origin: 'Richmond', 
        destination: 'Frankston',
        time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
      }
    },
    {
      description: 'Short distance journey',
      params: { origin: 'Melbourne Central', destination: 'Parliament' }
    }
  ];
  
  for (const example of examples) {
    console.log(`🔍 ${example.description}:`);
    console.log(`   Query: ${JSON.stringify(example.params)}`);\n    
    try {
      const result = await nextTrain.execute(example.params);
      if (result.data.departure) {
        console.log(`   ✅ Found: ${result.data.route.name} line`);
        console.log(`   ⏰ Departs: ${result.data.departure.scheduled}`);
        console.log(`   🚉 Platform: ${result.data.departure.platform || 'TBC'}`);
        console.log(`   📊 ${result.metadata?.executionTime}ms, ${result.metadata?.apiCalls} API calls`);
      }
    } catch (error: any) {
      console.log(`   ❌ ${error.message}`);
    }
    console.log();
  }
}

async function runLineTimetableExamples() {
  console.log('📅 Line Timetable Tool Examples');
  console.log('=================================\n');
  
  const ptvClient = new PtvClient();
  const lineTimetable = new LineTimetableTool(ptvClient);
  
  const examples = [
    {
      description: 'Major station, popular line',
      params: { stop: 'Flinders Street', route: 'Frankston' }
    },
    {
      description: 'With specific direction',
      params: { stop: 'Richmond', route: 'South Morang', direction: 'Up' }
    },
    {
      description: 'Extended time window (2 hours)',
      params: { stop: 'Southern Cross', route: 'Geelong', duration: 120 }
    },
    {
      description: 'Loop line station',
      params: { stop: 'Parliament', route: 'City Circle' }
    }
  ];
  
  for (const example of examples) {
    console.log(`📋 ${example.description}:`);
    console.log(`   Query: ${JSON.stringify(example.params)}`);
    
    try {
      const result = await lineTimetable.execute(example.params);
      console.log(`   ✅ ${result.data.departures.length} departures found`);
      console.log(`   🚉 ${result.data.stop.name} → ${result.data.route.name}`);
      
      if (result.data.departures.length > 0) {
        const next = result.data.departures[0];
        console.log(`   ⏰ Next: ${next.scheduled} (${next.destination})`);
        console.log(`   🚉 Platform: ${next.platform || 'TBC'}`);
      }
      
      if (result.data.timeWindow) {
        console.log(`   📅 Window: ${result.data.timeWindow.durationMinutes} minutes`);
      }
    } catch (error: any) {
      console.log(`   ❌ ${error.message}`);
    }
    console.log();
  }
}

async function runHowFarExamples() {
  console.log('📍 How Far Tool Examples');
  console.log('==========================\n');
  
  const ptvClient = new PtvClient();
  const howFar = new HowFarTool(ptvClient);
  
  const examples = [
    {
      description: 'Busy line with real-time tracking',
      params: { stop: 'Melbourne Central', route: 'Craigieburn' }
    },
    {
      description: 'With specific direction',
      params: { stop: 'Flinders Street', route: 'Frankston', direction: 'outbound' }
    },
    {
      description: 'Outer suburban station',
      params: { stop: 'South Morang', route: 'Hurstbridge', direction: 'inbound' }
    },
    {
      description: 'Airport line tracking',
      params: { stop: 'Southern Cross', route: 'Skybus' } // Note: might not exist as train
    }
  ];
  
  for (const example of examples) {
    console.log(`📍 ${example.description}:`);
    console.log(`   Query: ${JSON.stringify(example.params)}`);
    
    try {
      const result = await howFar.execute(example.params);
      console.log(`   ✅ Stop: ${result.data.stop.name}`);
      
      if (result.data.approaching) {
        const train = result.data.approaching;
        console.log(`   🚂 Train: ${train.destination}`);
        
        if (train.realTimePosition) {
          console.log(`   📍 Distance: ${train.realTimePosition.distanceMeters}m`);
          console.log(`   ⏱️ ETA: ${train.realTimePosition.etaMinutes} min`);
          console.log(`   📡 Accuracy: ${train.realTimePosition.accuracy}`);
        }
        
        if (train.vehicle) {
          console.log(`   🚋 Vehicle: ${train.vehicle.description}`);
        }
        
        console.log(`   📊 Data source: ${result.metadata?.dataSource}`);
      } else {
        console.log(`   ℹ️ No approaching trains detected`);
      }
    } catch (error: any) {
      console.log(`   ❌ ${error.message}`);
    }
    console.log();
  }
}

async function main() {
  console.log('🛠️ PTV MCP Individual Tool Examples\n');
  
  if (!config.ptvDevId || !config.ptvApiKey) {
    console.error('❌ PTV credentials not configured');
    process.exit(1);
  }
  
  console.log('Running comprehensive examples for each tool...\n');
  
  await runNextTrainExamples();
  await runLineTimetableExamples(); 
  await runHowFarExamples();
  
  console.log('🎉 All examples completed!');
  console.log('💡 Use these patterns to build your own queries.');
}

if (import.meta.main) {
  main().catch(console.error);
}
