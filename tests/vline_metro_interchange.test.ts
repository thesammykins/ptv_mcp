import type { ResultStop } from '../src/ptv/types';
import { ROUTE_TYPE } from '../src/ptv/types';
import { PtvClient } from '../src/ptv/client';

describe('V/Line to Metro Interchange', () => {
  let client: PtvClient;

  beforeEach(() => {
    client = new PtvClient();
    
    // Mock the search method for stop search results  
    client.search = jest.fn((term: string) => {
      // For Bendigo stop search - return both bus and train stops
      if (term.toLowerCase().includes('bendigo')) {
        return Promise.resolve({
          stops: [
            {
              stop_id: 4503,
              stop_name: 'Bendigo Bank/Maurice Ave ',
              latitude: -36.7576828,
              longitude: 144.281033,
              route_type: ROUTE_TYPE.VLINE,
              routes: [
                { route_id: 3301, route_name: 'Batemans Bay - Melbourne via Bairnsdale' }, // Bus route
                { route_id: 3302, route_name: 'Mallacoota - Genoa via Gipsy Point' }        // Bus route
              ]
            },
            {
              stop_id: 1509,
              stop_name: 'Bendigo Railway Station',
              latitude: -36.7629547,
              longitude: 144.2815247,
              route_type: ROUTE_TYPE.VLINE,
              routes: [
                { route_id: 1301, route_name: 'Bendigo - Melbourne via Gisborne' },         // Train route to Melbourne
                { route_id: 1302, route_name: 'Adelaide - Melbourne via Nhill & Bendigo' }, // Train route to Melbourne
                { route_id: 1303, route_name: 'Swan Hill - Melbourne via Bendigo' },        // Train route to Melbourne
                // ... more Melbourne-connecting train routes
              ]
            },
            {
              stop_id: 4071,
              stop_name: 'Bendigo Station/Railway Pl ',
              latitude: -36.7629547,
              longitude: 144.2815247,
              route_type: ROUTE_TYPE.VLINE,
              routes: [
                { route_id: 1304, route_name: 'Bendigo - Melbourne via Gisborne' },         // Train route to Melbourne
                // ... more Melbourne-connecting routes
              ]
            }
          ]
        });
      }
      
      // For Flinders Street stop search
      if (term.toLowerCase().includes('flinders street')) {
        return Promise.resolve({
          stops: [
            {
              stop_id: 1071,
              stop_name: 'Flinders Street',
              latitude: -37.8183,
              longitude: 144.9671,
              route_type: ROUTE_TYPE.TRAIN, // Metro station
              routes: [
                { route_id: 1, route_name: 'Alamein' },
                { route_id: 2, route_name: 'Belgrave' }
              ]
            },
            {
              stop_id: 4631,
              stop_name: 'Flinder St Station/Flinders St ',
              latitude: -37.8183,
              longitude: 144.9671,
              route_type: ROUTE_TYPE.VLINE, // V/Line platform
              routes: [
                { route_id: 1301, route_name: 'Bendigo - Melbourne via Gisborne' }
              ]
            }
          ]
        });
      }
      
      return Promise.resolve({ stops: [] });
    }) as jest.Mock;
  });

  test('should correctly prioritize train station over bus stop for V/Line origin', async () => {
    console.log('🧪 Testing V/Line to Metro station selection priority...');
    
    const bendigo = 'Bendigo';
    const flinders = 'Flinders Street';
    
    // Test the findCompatibleStopPair method
    const result = await client.findCompatibleStopPair(bendigo, flinders);
    
    console.log(`📍 Selected origin: ${result?.origin.stop_name} (${result?.origin.stop_id}) RouteType: ${result?.origin.route_type}`);
    console.log(`📍 Selected destination: ${result?.destination.stop_name} (${result?.destination.stop_id}) RouteType: ${result?.destination.route_type}`);
    
    // Should prioritize "Bendigo Railway Station" over "Bendigo Bank/Maurice Ave"
    expect(result?.origin.stop_name).toBe('Bendigo Railway Station');
    expect(result?.origin.stop_id).toBe(1509);
    expect(result?.origin.route_type).toBe(ROUTE_TYPE.VLINE);
    
    // Should select Metro Flinders Street for interchange capability
    expect(result?.destination.stop_name).toBe('Flinders Street');
    expect(result?.destination.stop_id).toBe(1071);
    expect(result?.destination.route_type).toBe(ROUTE_TYPE.TRAIN);
    
    console.log('✅ Correctly selected train station over bus stop and Metro destination for interchange!');
  });

  test('should handle Metro to V/Line direction (reverse)', async () => {
    console.log('🧪 Testing Metro to V/Line station selection...');
    
    const flinders = 'Flinders Street';
    const bendigo = 'Bendigo';
    
    // Test the reverse direction
    const result = await client.findCompatibleStopPair(flinders, bendigo);
    
    console.log(`📍 Selected origin: ${result?.origin.stop_name} (${result?.origin.stop_id}) RouteType: ${result?.origin.route_type}`);
    console.log(`📍 Selected destination: ${result?.destination.stop_name} (${result?.destination.stop_id}) RouteType: ${result?.destination.route_type}`);
    
    // Should select Metro Flinders Street as origin for interchange
    expect(result?.origin.stop_name).toBe('Flinders Street');
    expect(result?.origin.route_type).toBe(ROUTE_TYPE.TRAIN);
    
    // Should select V/Line platform for the interchange (reverse direction selects V/Line platform)
    expect(result?.destination.stop_name).toBe('Flinder St Station/Flinders St ');
    expect(result?.destination.route_type).toBe(ROUTE_TYPE.VLINE);
    
    console.log('✅ Correctly selected Metro origin and V/Line train station destination!');
  });
});