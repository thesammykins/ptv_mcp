#!/usr/bin/env bun

/**
 * Test PTV MCP Server Tools Directly
 * Tests the three example scenarios with the production MCP server
 */

import { NextTrainTool } from './src/features/next_train/tool';
import { LineTimetableTool } from './src/features/line_timetable/tool';
import { HowFarTool } from './src/features/how_far/tool';
import { PtvClient } from './src/ptv/client';
import { formatUTCForMelbourne } from './src/utils/melbourne-time';

async function testMCPProductionServer() {
  console.log('🚂 Testing PTV MCP Production Server');
  console.log('=====================================');
  console.log('');
  
  const client = new PtvClient();
  
  // Test the exact same examples provided
  const examples = [
    {
      question: '"When is the next train from Flinders Street to South Morang?"',
      tool: 'next-train',
      test: async () => {
        const nextTrainTool = new NextTrainTool(client);
        return await nextTrainTool.execute({
          origin: "Flinders Street",
          destination: "South Morang"
        });
      }
    },
    {
      question: '"How far away is the next train on Platform 1 at Flinders Street headed to Hurstbridge?"',
      tool: 'how-far',
      test: async () => {
        const howFarTool = new HowFarTool(client);
        return await howFarTool.execute({
          stop: "Flinders Street",
          route: "Hurstbridge"
        });
      }
    },
    {
      question: '"Get me the timetable for the Mernda line at Flinders Street for the next hour"',
      tool: 'line-timetable',
      test: async () => {
        const lineTimetableTool = new LineTimetableTool(client);
        return await lineTimetableTool.execute({
          stop: "Flinders Street",
          route: "Mernda",
          durationMinutes: 60
        });
      }
    }
  ];
  
  for (const example of examples) {
    console.log(`🔍 Example: ${example.question}`);
    console.log(`🛠️  Tool: ${example.tool}`);
    console.log('-'.repeat(80));
    
    try {
      const result = await example.test();
      
      console.log('✅ SUCCESS!');
      console.log('');
      console.log('📊 Response Data:');
      console.log(JSON.stringify(result.data, null, 2));
      console.log('');
      console.log('📈 Metadata:');
      console.log(`   Execution Time: ${result.metadata.executionTime}ms`);
      console.log(`   API Calls: ${result.metadata.apiCalls}`);
      console.log(`   Data Source: ${result.metadata.dataSource || 'PTV API'}`);
      if (result.metadata.timezone) {
        console.log(`   Melbourne Time: ${result.metadata.timezone.melbourneLocal}`);
        console.log(`   Timezone: ${result.metadata.timezone.offset}`);
      }
      
      // Provide user-friendly summary
      console.log('');
      console.log('🎯 User-Friendly Summary:');
      
      if (example.tool === 'next-train' && result.data.departure) {
        const melbourneTime = formatUTCForMelbourne(result.data.departure.scheduled);
        console.log(`   Next train: ${result.data.route?.name} line`);
        console.log(`   Departure: ${melbourneTime} Melbourne time`);
        console.log(`   Platform: ${result.data.departure.platform || 'TBC'}`);
        console.log(`   From: ${result.data.origin?.name} to ${result.data.destination?.name}`);
      }
      
      if (example.tool === 'how-far' && result.data.approachingTrains?.length > 0) {
        const train = result.data.approachingTrains[0];
        console.log(`   Closest train: ${Math.round(train.distanceMeters)}m away`);
        console.log(`   ETA: ${train.eta.toFixed(1)} minutes`);
        console.log(`   Route: ${result.data.route?.name}`);
        console.log(`   Data accuracy: ${train.accuracy}`);
      }
      
      if (example.tool === 'line-timetable' && result.data.departures?.length > 0) {
        console.log(`   Found ${result.data.departures.length} departures in the next hour`);
        console.log(`   Route: ${result.data.route?.name}`);
        console.log(`   Next departure: ${formatUTCForMelbourne(result.data.departures[0].scheduled)}`);
        console.log(`   Platform: ${result.data.departures[0].platform || 'TBC'}`);
      }
      
    } catch (error: any) {
      console.log('❌ ERROR!');
      console.log(`   Code: ${error.code || 'UNKNOWN'}`);
      console.log(`   Message: ${error.message}`);
      console.log(`   Status: ${error.status || 'N/A'}`);
    }
    
    console.log('');
    console.log('='.repeat(80));
    console.log('');
  }
}

if (import.meta.main) {
  testMCPProductionServer().catch(console.error);
}
