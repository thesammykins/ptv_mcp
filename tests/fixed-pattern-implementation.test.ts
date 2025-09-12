import { describe, it, expect } from 'bun:test';
import { PtvClient } from '../src/ptv/client';
import { ConnectionValidityStatus, StoppingPatternResponse } from '../src/ptv/types';
import { TTLCache } from '../src/ptv/cache';

describe('Fixed Pattern Implementation', () => {
  const skipIfNoCredentials = () => {
    if (!process.env.PTV_DEV_ID || !process.env.PTV_API_KEY) {
      console.warn('⚠️ Skipping test - PTV API credentials not available');
      return true;
    }
    return false;
  };

  it('should correctly retrieve and process complete stopping patterns', async () => {
    if (skipIfNoCredentials()) return;
    
    const client = new PtvClient();
    
    // Test with a known V/Line run (Bendigo → Southern Cross)
    const runRef = '9737';
    const routeType = 3; // V/Line
    
    console.log(`🧪 Testing fixed pattern implementation for run ${runRef}, route_type ${routeType}`);
    
    try {
      // Get the complete stopping pattern
      const pattern = await client.getRunPattern(runRef, routeType);
      
      console.log(`✅ Pattern API call successful`);
      console.log(`📊 Response Keys:`, Object.keys(pattern));
      console.log(`🚂 Departures count: ${pattern.departures?.length || 0}`);
      
      // Validate basic structure
      expect(pattern.departures).toBeDefined();
      expect(Array.isArray(pattern.departures)).toBe(true);
      expect(pattern.departures?.length).toBeGreaterThan(0);
      
      if (pattern.departures) {
        // Find all unique stops
        const uniqueStopIds = [...new Set(pattern.departures.map(d => d.stop_id))];
        console.log(`🗺️  Unique stops in pattern: ${uniqueStopIds.length}`);
        
        // Check for crucial stops
        const hasBendigo = uniqueStopIds.includes(1509);
        const hasSouthernCross = uniqueStopIds.includes(1181);
        
        console.log(`🚉 Bendigo (1509) found: ${hasBendigo ? '✅' : '❌'}`);
        console.log(`🏛️  Southern Cross (1181) found: ${hasSouthernCross ? '✅' : '❌'}`);
        
        expect(hasBendigo).toBe(true);
        expect(hasSouthernCross).toBe(true);
        
        // Check if we can find a specific departure for each key stop
        const bendigoDeparture = pattern.departures.find(d => d.stop_id === 1509);
        const southernCrossDeparture = pattern.departures.find(d => d.stop_id === 1181);
        
        expect(bendigoDeparture).toBeDefined();
        expect(southernCrossDeparture).toBeDefined();
        
        if (bendigoDeparture && southernCrossDeparture) {
          console.log(`🚉 Bendigo departure: ${bendigoDeparture.scheduled_departure_utc}`);
          console.log(`🏛️  Southern Cross arrival: ${southernCrossDeparture.scheduled_departure_utc}`);
          
          // Calculate travel time
          const bendigoTime = new Date(bendigoDeparture.scheduled_departure_utc || '');
          const southernCrossTime = new Date(southernCrossDeparture.scheduled_departure_utc || '');
          const travelTimeMinutes = (southernCrossTime.getTime() - bendigoTime.getTime()) / (1000 * 60);
          
          console.log(`⏱️  Travel time: ${travelTimeMinutes.toFixed(0)} minutes`);
          
          // For V/Line journeys, travel time should be significant (e.g., >60 minutes)
          expect(travelTimeMinutes).toBeGreaterThan(60);
          
          // Simulate connection validation logic
          const connectionRequired = 12; // Southern Cross → Metro connection requires ~12 minutes
          const nextDepartureTime = new Date(southernCrossTime.getTime() + (connectionRequired * 60 * 1000));
          
          // Function to test connection validity
          function validateConnection(
            arrivalTimeUtc: Date, 
            departureTimeUtc: Date, 
            minConnectionMinutes: number
          ): ConnectionValidityStatus {
            const actualWaitMinutes = (departureTimeUtc.getTime() - arrivalTimeUtc.getTime()) / (1000 * 60);
            console.log(`🔄 Connection wait time: ${actualWaitMinutes.toFixed(1)} minutes (min required: ${minConnectionMinutes})`);
            
            if (actualWaitMinutes < minConnectionMinutes) {
              return ConnectionValidityStatus.INFEASIBLE;
            } else if (actualWaitMinutes < minConnectionMinutes + 2) {
              return ConnectionValidityStatus.TIGHT;
            } else {
              return ConnectionValidityStatus.FEASIBLE;
            }
          }
          
          // Test with different connection times
          const tightConnection = validateConnection(
            southernCrossTime,
            new Date(southernCrossTime.getTime() + (connectionRequired * 60 * 1000)),
            connectionRequired
          );
          console.log(`🟡 Tight connection validity: ${tightConnection}`);
          expect(tightConnection).toBe(ConnectionValidityStatus.TIGHT); // Exactly minimum time = tight
          
          const infeasibleConnection = validateConnection(
            southernCrossTime,
            new Date(southernCrossTime.getTime() + (5 * 60 * 1000)),
            connectionRequired
          );
          console.log(`🔴 Infeasible connection validity: ${infeasibleConnection}`);
          expect(infeasibleConnection).toBe(ConnectionValidityStatus.INFEASIBLE);
          
          const feasibleConnection = validateConnection(
            southernCrossTime,
            new Date(southernCrossTime.getTime() + (20 * 60 * 1000)),
            connectionRequired
          );
          console.log(`🟢 Feasible connection validity: ${feasibleConnection}`);
          expect(feasibleConnection).toBe(ConnectionValidityStatus.FEASIBLE);
        }
      }
      
    } catch (error) {
      console.error(`❌ Fixed pattern implementation test failed:`, error);
      throw error;
    }
  });
  
  it('should cache pattern results effectively', async () => {
    if (skipIfNoCredentials()) return;
    
    const client = new PtvClient();
    const patternCache = new TTLCache<StoppingPatternResponse>(5 * 60 * 1000); // 5 minute TTL
    
    const runRef = '9737';
    const routeType = 3;
    const cacheKey = `pattern:${runRef}:${routeType}`;
    
    console.log(`🧪 Testing pattern caching`);
    
    try {
      // Initial fetch (should miss cache)
      console.time('First fetch');
      const pattern1 = await client.getRunPattern(runRef, routeType);
      console.timeEnd('First fetch');
      
      // Cache the result
      patternCache.set(cacheKey, pattern1);
      
      // Simulate cache lookup
      console.time('Cache lookup');
      const cachedPattern = patternCache.get(cacheKey);
      console.timeEnd('Cache lookup');
      
      expect(cachedPattern).toBeDefined();
      if (cachedPattern) {
        console.log(`✅ Pattern found in cache with ${cachedPattern.departures?.length || 0} departures`);
        expect(cachedPattern.departures?.length).toBeGreaterThan(0);
      }
      
      // Verify cached pattern contains crucial stops
      if (cachedPattern?.departures) {
        const uniqueStopIds = [...new Set(cachedPattern.departures.map(d => d.stop_id))];
        const hasBendigo = uniqueStopIds.includes(1509);
        const hasSouthernCross = uniqueStopIds.includes(1181);
        
        expect(hasBendigo).toBe(true);
        expect(hasSouthernCross).toBe(true);
        console.log(`✅ Cached pattern contains both Bendigo and Southern Cross stops`);
      }
      
    } catch (error) {
      console.error(`❌ Pattern caching test failed:`, error);
      throw error;
    }
  });
});