/**
 * Stopping Pattern Debug Test
 * 
 * Deep debugging of PTV API stopping pattern retrieval to understand why
 * getRunPattern returns empty stopping patterns.
 */

import { PtvClient } from '../src/ptv/client';
import * as dotenv from 'dotenv';

// Load production API keys
dotenv.config();

describe('Stopping Pattern Debug', () => {
  let ptvClient: PtvClient;

  beforeAll(async () => {
    console.log('🔧 Setting up PTV Client for debugging...');
    
    // Validate we have API credentials
    if (!process.env.PTV_DEV_ID || !process.env.PTV_API_KEY) {
      throw new Error('Missing PTV API credentials in .env file');
    }

    ptvClient = new PtvClient();
  });

  describe('Direct PTV API Pattern Calls', () => {
    test('should debug raw getRunPattern API call', async () => {
      console.log('🔍 Testing direct getRunPattern API call...');
      
      try {
        // Known V/Line run reference from previous tests
        const runRef = '9737';  // Bendigo to Southern Cross
        const routeType = 3;    // V/Line
        
        console.log(`📍 Testing run: ${runRef}, route type: ${routeType}`);
        
        // Call the API directly with all possible expands
        const response = await ptvClient.getRunPattern(runRef, routeType, {
          expand: [1, 2, 3] // STOP, ROUTE, RUN
        });
        
        console.log('📊 Raw API Response:');
        console.log('Keys:', Object.keys(response));
        console.log('Response:', JSON.stringify(response, null, 2));
        
        // Check what we got back
        if (response.departures) {
          console.log(`✅ Found ${response.departures.length} departures in pattern`);
          
          if (response.departures.length > 0) {
            const firstDeparture = response.departures[0];
            console.log('🚉 First departure:', JSON.stringify(firstDeparture, null, 2));
            
            if (firstDeparture.stop_id) {
              console.log(`✅ Departure has stop_id: ${firstDeparture.stop_id}`);
            } else {
              console.log('❌ Departure missing stop_id');
            }
          }
        } else {
          console.log('❌ No departures field in response');
        }
        
        if (response.stops) {
          console.log(`✅ Found ${response.stops.length} stops in pattern`);
          
          // Look for Southern Cross (stop ID 1181)
          const southernCross = response.stops.find((stop: any) => stop.stop_id === 1181);
          if (southernCross) {
            console.log('✅ Southern Cross found in stopping pattern');
            console.log('🚉 Southern Cross stop:', JSON.stringify(southernCross, null, 2));
          } else {
            console.log('❌ Southern Cross NOT found in stopping pattern');
            console.log('🚉 Available stops:', response.stops?.map((s: any) => `${s.stop_name} (${s.stop_id})`));
          }
        } else {
          console.log('❌ No stops field in response');
        }
        
      } catch (error: any) {
        console.error('❌ API call failed:', error.message);
        console.error('Stack:', error.stack);
        throw error;
      }
    }, 30000);

    test('should test different expand parameter combinations', async () => {
      console.log('🧪 Testing different expand parameter combinations...');
      
      const runRef = '9737';
      const routeType = 3;
      
      // Test different expand combinations
      const expandCombinations = [
        { label: 'No expand', expand: undefined },
        { label: 'STOP only', expand: [1] },
        { label: 'ROUTE only', expand: [2] }, 
        { label: 'RUN only', expand: [3] },
        { label: 'STOP + ROUTE', expand: [1, 2] },
        { label: 'STOP + RUN', expand: [1, 3] },
        { label: 'ROUTE + RUN', expand: [2, 3] },
        { label: 'All expands', expand: [1, 2, 3] }
      ];
      
      for (const combo of expandCombinations) {
        try {
          console.log(`\n🧪 Testing: ${combo.label} (expand: ${combo.expand?.join(',') || 'none'})`);
          
          const response = await ptvClient.getRunPattern(runRef, routeType, combo.expand ? { expand: combo.expand } : {});
          
          console.log(`   Keys: ${Object.keys(response).join(', ')}`);
          console.log(`   Departures: ${response.departures?.length || 0}`);
          console.log(`   Stops: ${response.stops?.length || 0}`);
          
          if (response.stops?.length > 0) {
            const hasSouthernCross = response.stops.some((stop: any) => stop.stop_id === 1181);
            console.log(`   Has Southern Cross: ${hasSouthernCross ? '✅' : '❌'}`);
            
            if (hasSouthernCross) {
              console.log(`   🎯 FOUND WORKING COMBINATION: ${combo.label}`);
            }
          }
          
        } catch (error: any) {
          console.log(`   ❌ Failed: ${error.message}`);
        }
      }
    }, 60000);

    test('should test Metro run for comparison', async () => {
      console.log('🚇 Testing Metro run pattern for comparison...');
      
      try {
        // Known Metro run from Southern Cross to Flinders Street
        const runRef = '954470';  // Craigieburn line
        const routeType = 0;      // Metro
        
        console.log(`📍 Testing Metro run: ${runRef}, route type: ${routeType}`);
        
        const response = await ptvClient.getRunPattern(runRef, routeType, {
          expand: [1, 2, 3] // STOP, ROUTE, RUN
        });
        
        console.log('📊 Metro Run Response:');
        console.log(`   Departures: ${response.departures?.length || 0}`);
        console.log(`   Stops: ${response.stops?.length || 0}`);
        
        if (response.stops?.length > 0) {
          const flindersStreet = response.stops.find((stop: any) => stop.stop_id === 1071);
          if (flindersStreet) {
            console.log('✅ Flinders Street found in Metro stopping pattern');
          } else {
            console.log('❌ Flinders Street NOT found in Metro stopping pattern');
            console.log('🚉 Available Metro stops:', response.stops?.slice(0, 5).map((s: any) => `${s.stop_name} (${s.stop_id})`));
          }
        }
        
      } catch (error: any) {
        console.error('❌ Metro API call failed:', error.message);
        // Don't fail the test for Metro issues
      }
    }, 30000);
  });

  describe('Journey Timing Engine Integration', () => {
    test('should test journey timing engine stopping pattern method directly', async () => {
      console.log('⚙️  Testing JourneyTimingEngine stopping pattern method...');
      
      // Import and test the journey timing engine directly
      const { JourneyTimingEngine } = await import('../src/features/journey-planning/journey-timing-engine');
      const engine = new JourneyTimingEngine();
      
      try {
        // Use reflection to call the private method for testing
        const getRunStoppingPatternMethod = (engine as any).getRunStoppingPattern;
        if (typeof getRunStoppingPatternMethod === 'function') {
          const pattern = await getRunStoppingPatternMethod.call(engine, '9737', 3);
          
          console.log('⚙️  Journey Engine Response:');
          console.log('   Keys:', Object.keys(pattern));
          console.log('   Departures:', pattern.departures?.length || 0);
          console.log('   Stops:', pattern.stops?.length || 0);
          
          if (pattern.stops?.length > 0) {
            const hasSouthernCross = pattern.stops.some((stop: any) => stop.stop_id === 1181);
            console.log(`   Has Southern Cross: ${hasSouthernCross ? '✅' : '❌'}`);
          }
        } else {
          console.log('❌ getRunStoppingPattern method not found');
        }
        
      } catch (error: any) {
        console.error('❌ Journey engine test failed:', error.message);
        throw error;
      }
    }, 30000);
  });
});