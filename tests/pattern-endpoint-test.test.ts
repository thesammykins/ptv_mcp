import { describe, it, expect } from 'bun:test';
import { ptvFetch } from '../src/ptv/http.js';

describe('PTV Pattern Endpoint Test', () => {
  const skipIfNoCredentials = () => {
    if (!process.env.PTV_DEV_ID || !process.env.PTV_API_KEY) {
      console.warn('⚠️ Skipping test - PTV API credentials not available');
      return true;
    }
    return false;
  };

  it('should retrieve stopping pattern using the correct /v3/pattern/run endpoint', async () => {
    if (skipIfNoCredentials()) return;
    
    // Test the V/Line Bendigo run that we know exists
    const runRef = '9737';
    const routeType = 3; // V/Line

    console.log(`🧪 Testing pattern endpoint for run ${runRef}, route_type ${routeType}`);

    try {
      // Call the CORRECT endpoint: /v3/pattern/run/{run_ref}/route_type/{route_type}
      const response = await ptvFetch(`/v3/pattern/run/${runRef}/route_type/${routeType}`, {
        expand: [1], // Expand Stop objects
        include_skipped_stops: true
      });

      console.log(`✅ API call successful`);
      console.log(`📊 Response Keys:`, Object.keys(response));

      // This should return a V3.StoppingPattern with:
      // - departures: array of all stops with scheduled_departure_utc
      // - stops: stop details if expanded
      // - routes, runs, directions, etc.

      expect(response).toBeDefined();
      expect(response.departures).toBeDefined();
      expect(Array.isArray(response.departures)).toBe(true);

      console.log(`🚂 Departures count: ${response.departures?.length || 0}`);
      
      if (response.departures && response.departures.length > 0) {
        // Check the structure of departures
        const firstDeparture = response.departures[0];
        console.log(`📍 First departure structure:`, Object.keys(firstDeparture));
        console.log(`📍 First departure stop_id: ${firstDeparture.stop_id}`);
        console.log(`📍 First departure scheduled_departure_utc: ${firstDeparture.scheduled_departure_utc}`);

        // Find unique stops
        const uniqueStopIds = [...new Set(response.departures.map(d => d.stop_id))];
        console.log(`🗺️  Unique stops in pattern: ${uniqueStopIds.length}`);
        console.log(`🗺️  Stop IDs: [${uniqueStopIds.slice(0, 5).join(', ')}${uniqueStopIds.length > 5 ? '...' : ''}]`);

        // Check if Southern Cross (1181) is in the pattern
        const hasSouthernCross = uniqueStopIds.includes(1181);
        console.log(`🏛️  Southern Cross (1181) found: ${hasSouthernCross ? '✅' : '❌'}`);

        // Check if Bendigo (1509) is in the pattern
        const hasBendigo = uniqueStopIds.includes(1509);
        console.log(`🚉 Bendigo (1509) found: ${hasBendigo ? '✅' : '❌'}`);

        if (hasSouthernCross && hasBendigo) {
          console.log(`🎯 SUCCESS: Pattern contains both Bendigo and Southern Cross!`);
          
          // Find the specific departures
          const bendigoDeparture = response.departures.find(d => d.stop_id === 1509);
          const southernCrossDeparture = response.departures.find(d => d.stop_id === 1181);
          
          if (bendigoDeparture && southernCrossDeparture) {
            console.log(`🚉 Bendigo departure: ${bendigoDeparture.scheduled_departure_utc}`);
            console.log(`🏛️  Southern Cross arrival: ${southernCrossDeparture.scheduled_departure_utc}`);
            
            // Calculate travel time
            const bendigoTime = new Date(bendigoDeparture.scheduled_departure_utc);
            const southernCrossTime = new Date(southernCrossDeparture.scheduled_departure_utc);
            const travelTimeMinutes = (southernCrossTime.getTime() - bendigoTime.getTime()) / (1000 * 60);
            
            console.log(`⏱️  Travel time: ${travelTimeMinutes.toFixed(0)} minutes`);
          }
        }
      }

      // Check if stops are expanded
      if (response.stops) {
        console.log(`📍 Stops metadata count: ${Object.keys(response.stops).length}`);
      }

      // Basic validation
      expect(response.departures.length).toBeGreaterThan(0);
      
      // Each departure should have the required fields
      const departure = response.departures[0];
      expect(departure.stop_id).toBeDefined();
      expect(departure.scheduled_departure_utc).toBeDefined();
      expect(departure.run_ref).toBe(runRef);

    } catch (error) {
      console.error(`❌ Pattern endpoint test failed:`, error);
      throw error;
    }
  });
});