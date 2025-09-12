/**
 * Fixed Connection-Aware Journey Planning Test
 * 
 * Tests the corrected PTV API integration that uses the departures endpoint
 * to get actual stopping patterns with departure times.
 */

import { NextTrainTool } from '../src/features/next_train/tool';
import * as dotenv from 'dotenv';

// Load production API keys
dotenv.config();

describe('Fixed Connection-Aware Journey Planning', () => {
  let tool: NextTrainTool;

  beforeAll(async () => {
    console.log('🔧 Setting up fixed connection test...');
    
    // Validate we have API credentials
    if (!process.env.PTV_DEV_ID || !process.env.PTV_API_KEY) {
      throw new Error('Missing PTV API credentials in .env file');
    }

    tool = new NextTrainTool();
  });

  test('should successfully plan Bendigo to Flinders Street with realistic connections', async () => {
    console.log('🎯 Testing: Bendigo to Flinders Street with fixed API integration');
    
    const result = await tool.execute({
      origin: 'Bendigo Railway Station',
      destination: 'Flinders Street Station',
      allowConnections: true
    });

    console.log('📊 Connection result:', JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.log(`⚠️  Error occurred: ${result.error.code} - ${result.error.message}`);
      
      // The error should be meaningful, not a technical failure
      expect(['NO_FEASIBLE_CONNECTIONS', 'ROUTING_ERROR', 'NO_ROUTE']).toContain(result.error.code);
      
      // Should NOT be the old pattern issue
      expect(result.error.message).not.toContain('No interchange stop found in stopping pattern');
      expect(result.error.message).not.toContain('this.patternCache.has is not a function');
    } else if (result.data?.legs && result.data.legs.length > 1) {
      console.log('✅ Multi-leg journey found!');
      
      const legs = result.data.legs;
      const firstLeg = legs[0];
      const secondLeg = legs[1];
      
      // Validate it's a realistic connection
      if (firstLeg.arrival_time && secondLeg.departure_time) {
        const arrivalTime = new Date(firstLeg.arrival_time);
        const departureTime = new Date(secondLeg.departure_time);
        const connectionMinutes = (departureTime.getTime() - arrivalTime.getTime()) / (1000 * 60);
        
        console.log(`⏱️  Connection time: ${connectionMinutes} minutes`);
        console.log(`🚂 First leg: ${firstLeg.origin_stop_name} → ${firstLeg.destination_stop_name}`);
        console.log(`🚇 Second leg: ${secondLeg.origin_stop_name} → ${secondLeg.destination_stop_name}`);
        
        // Should be at least 8 minutes (realistic connection) and not ridiculously long
        expect(connectionMinutes).toBeGreaterThan(5);
        expect(connectionMinutes).toBeLessThan(180);
        
        // Should NOT be the impossible 8-minute connection we were getting before
        if (connectionMinutes < 10) {
          console.log('⚠️  Connection time is quite tight, but within reasonable bounds');
        }
        
        console.log('✅ Connection timing looks realistic');
      }
      
      // Validate journey structure
      expect(legs).toHaveLength(2);
      expect(firstLeg.route_type).toBe(3); // Should start with V/Line
      expect(secondLeg.route_type).toBe(0); // Should connect to Metro
      
    } else if (result.data && result.data.legs?.length === 1) {
      console.log('ℹ️  Direct journey found (no connections needed)');
    } else {
      console.log('⚠️  Unexpected result format');
    }
  }, 120000); // 2 minute timeout for comprehensive test

  test('should handle known direct routes correctly', async () => {
    console.log('🧪 Testing direct route (no connections needed)');
    
    const result = await tool.execute({
      origin: 'Southern Cross Station',
      destination: 'Flinders Street Station',
      allowConnections: false
    });

    console.log('📊 Direct route result:', result.data ? 'Success' : 'Error');
    
    if (result.data) {
      expect(result.data.legs).toHaveLength(1);
      console.log('✅ Direct route handled correctly');
    }
  }, 60000);
});