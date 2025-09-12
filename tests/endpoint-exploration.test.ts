/**
 * Endpoint Exploration Test
 * 
 * Tests different PTV API endpoint combinations to find the correct
 * stopping pattern endpoint that returns the V3.StoppingPattern model.
 */

import { ptvFetch } from '../src/ptv/http';
// Skip if no credentials available

describe('PTV API Endpoint Exploration', () => {
  beforeAll(async () => {
    console.log('🔧 Setting up endpoint exploration tests...');
  });

  const skipIfNoCredentials = () => {
    if (!process.env.PTV_DEV_ID || !process.env.PTV_API_KEY) {
      console.warn('⚠️  Skipping test - PTV API credentials not available');
      return true;
    }
    return false;
  };

  describe('Different Endpoint Approaches', () => {
    const runRef = '9737';  // Known V/Line run
    const routeType = 3;    // V/Line

    test('should try /v3/runs/{run_ref} without route_type', async () => {
      if (skipIfNoCredentials()) return;
      
      console.log('🧪 Testing: GET /v3/runs/{run_ref}');
      
      try {
        const response = await ptvFetch<any>(`/v3/runs/${runRef}`, {
          route_type: routeType.toString(),
          expand: [1, 2, 3].join(',') // STOP, ROUTE, RUN
        });
        
        console.log('   Keys:', Object.keys(response));
        console.log('   Has departures:', !!response.departures);
        console.log('   Has stops:', !!response.stops);
        console.log('   Response type:', response.constructor.name);
        
        if (response.departures?.length > 0) {
          console.log('   ✅ Found departures in response');
        }
        
      } catch (error: any) {
        console.log('   ❌ Error:', error.message);
      }
    }, 30000);

    test('should try /v3/pattern/{run_ref}/route_type/{route_type}', async () => {
      if (skipIfNoCredentials()) return;
      
      console.log('🧪 Testing: GET /v3/pattern/{run_ref}/route_type/{route_type}');
      
      try {
        const response = await ptvFetch<any>(`/v3/pattern/${runRef}/route_type/${routeType}`, {
          expand: [1, 2, 3].join(',') // STOP, ROUTE, RUN
        });
        
        console.log('   Keys:', Object.keys(response));
        console.log('   Has departures:', !!response.departures);
        console.log('   Has stops:', !!response.stops);
        
        if (response.departures?.length > 0) {
          console.log('   ✅ Found departures in response');
        }
        
      } catch (error: any) {
        console.log('   ❌ Error:', error.message);
      }
    }, 30000);

    test('should try /v3/runs/{run_ref}/route_type/{route_type} with different expands', async () => {
      if (skipIfNoCredentials()) return;
      
      console.log('🧪 Testing: Current endpoint with ALL expand');
      
      try {
        const response = await ptvFetch<any>(`/v3/runs/${runRef}/route_type/${routeType}`, {
          expand: '0', // ALL
          include_skipped_stops: 'true'
        });
        
        console.log('   Keys:', Object.keys(response));
        console.log('   Has departures:', !!response.departures);
        console.log('   Has stops:', !!response.stops);
        
        if (response.runs) {
          console.log('   Runs array length:', response.runs.length);
          if (response.runs[0]) {
            console.log('   First run keys:', Object.keys(response.runs[0]));
          }
        }
        
      } catch (error: any) {
        console.log('   ❌ Error:', error.message);
      }
    }, 30000);

    test('should explore departures endpoint for stopping pattern', async () => {
      if (skipIfNoCredentials()) return;
      
      console.log('🧪 Testing: Use departures endpoint to get stopping patterns');
      
      try {
        // First get run details to find route_id
        const runResponse = await ptvFetch<any>(`/v3/runs/${runRef}/route_type/${routeType}`, {
          expand: [2].join(',') // ROUTE
        });
        
        if (runResponse.runs?.[0]?.route_id) {
          const routeId = runResponse.runs[0].route_id;
          console.log('   Found route_id:', routeId);
          
          // Now try to get departures for that route to see stopping patterns
          const departuresResponse = await ptvFetch<any>(`/v3/departures/route_type/${routeType}/stop/1509`, {
            route_id: routeId.toString(),
            max_results: '1',
            expand: [0].join(',') // ALL
          });
          
          console.log('   Departures response keys:', Object.keys(departuresResponse));
          console.log('   Has departures:', !!departuresResponse.departures);
          console.log('   Departures length:', departuresResponse.departures?.length || 0);
          
          if (departuresResponse.departures?.[0]) {
            const firstDeparture = departuresResponse.departures[0];
            console.log('   First departure keys:', Object.keys(firstDeparture));
            console.log('   Run ref matches:', firstDeparture.run_ref === runRef);
          }
          
        } else {
          console.log('   ❌ Could not find route_id in run response');
        }
        
      } catch (error: any) {
        console.log('   ❌ Error:', error.message);
      }
    }, 30000);

    test('should explore if runs endpoint has stopping pattern when expanded', async () => {
      if (skipIfNoCredentials()) return;
      
      console.log('🧪 Testing: /v3/runs/route/{route_id}/route_type/{route_type} endpoint');
      
      try {
        // First get run details to find route_id  
        const runResponse = await ptvFetch<any>(`/v3/runs/${runRef}/route_type/${routeType}`);
        
        if (runResponse.runs?.[0]?.route_id) {
          const routeId = runResponse.runs[0].route_id;
          console.log('   Found route_id:', routeId);
          
          // Try the runs/route endpoint
          const runsResponse = await ptvFetch<any>(`/v3/runs/route/${routeId}/route_type/${routeType}`, {
            expand: [0].join(','), // ALL
            date_utc: new Date().toISOString()
          });
          
          console.log('   Runs by route response keys:', Object.keys(runsResponse));
          console.log('   Has runs:', !!runsResponse.runs);
          console.log('   Runs length:', runsResponse.runs?.length || 0);
          
          if (runsResponse.runs?.length > 0) {
            const matchingRun = runsResponse.runs.find((r: any) => r.run_ref === runRef);
            if (matchingRun) {
              console.log('   Found matching run keys:', Object.keys(matchingRun));
              console.log('   Has geopath:', !!matchingRun.geopath);
              console.log('   Geopath length:', matchingRun.geopath?.length || 0);
            }
          }
          
        }
        
      } catch (error: any) {
        console.log('   ❌ Error:', error.message);
      }
    }, 30000);
  });
});