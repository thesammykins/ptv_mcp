/*
  Integration tests for HowFarTool  
  Tests real-time vehicle position tracking and schedule-based estimates
*/

import { HowFarTool } from '@/features/how_far/tool';
import { ROUTE_TYPE } from '@/ptv/types';

// Mock PTV client
const createMockPTVClient = () => ({
  findTrainStops: jest.fn(),
  getDirectionsForRoute: jest.fn(),
  getRuns: jest.fn(),
  getDepartures: jest.fn(),
  getRoutes: jest.fn(),
  getAllTrainRoutes: jest.fn(),
});

const createMockStopResponse = (overrides = {}) => ({
  stop_id: 1071,
  stop_name: 'Flinders Street',
  stop_suburb: 'Melbourne',
  stop_latitude: -37.8183,
  stop_longitude: 144.9671,
  route_type: ROUTE_TYPE.TRAIN,
  routes: [
    { route_id: 2, route_name: 'Hurstbridge', route_number: 'Hurstbridge', route_type: ROUTE_TYPE.TRAIN },
  ],
  ...overrides,
});

describe('HowFar Tool Integration', () => {
  let mockPtvClient: ReturnType<typeof createMockPTVClient>;

  beforeEach(() => {
    mockPtvClient = createMockPTVClient();
    jest.clearAllMocks();
  });

  it('should track approaching train with real-time vehicle position', async () => {
    // Mock stop resolution
    mockPtvClient.findTrainStops.mockResolvedValue([
      createMockStopResponse()
    ]);

    // Mock directions
    mockPtvClient.getDirectionsForRoute.mockResolvedValue({
      directions: [
        { direction_id: 1, direction_name: 'Up' },
        { direction_id: 2, direction_name: 'Down' }
      ]
    });

    // Mock runs with real-time vehicle position
    mockPtvClient.getRuns.mockResolvedValue({
      runs: [{
        run_ref: 'run-123',
        route_id: 2,
        route_type: ROUTE_TYPE.TRAIN,
        direction_id: 1,
        destination_name: 'Hurstbridge',
        vehicle_position: {
          latitude: -37.8100,  // About 1km north of Flinders Street
          longitude: 144.9671,
          bearing: 180, // Southbound
          datetime_utc: new Date().toISOString(),
        },
        vehicle_descriptor: {
          operator: 'Metro Trains',
          id: 'X123',
          description: 'X\'Trapolis 100',
          low_floor: true,
          air_conditioned: true,
        }
      }]
    });

    const tool = new HowFarTool(mockPtvClient as any);
    
    const result = await tool.execute({
      stop: 'Flinders Street',
      route: 'Hurstbridge',
    });

    // Verify the response structure
    expect(result.data.stop).toMatchObject({
      id: 1071,
      name: 'Flinders Street',
      suburb: 'Melbourne',
      coordinates: {
        latitude: -37.8183,
        longitude: 144.9671
      }
    });

    expect(result.data.route).toMatchObject({
      id: 2,
      name: 'Hurstbridge',
      number: 'Hurstbridge'
    });

    expect(result.data.approachingTrains).toHaveLength(1);
    const approaching = result.data.approachingTrains[0];
    
    expect(approaching).toMatchObject({
      runRef: 'run-123',
      destination: 'Hurstbridge',
      accuracy: 'realtime',
      vehicle: {
        id: 'X123',
        operator: 'Metro Trains',
        description: 'X\'Trapolis 100',
        lowFloor: true,
        airConditioned: true,
      }
    });

    expect(approaching.realTimePosition).toMatchObject({
      latitude: -37.8100,
      longitude: 144.9671,
      bearing: 180,
    });
    
    expect(typeof approaching.realTimePosition?.lastUpdated).toBe('string');
    expect(typeof approaching.distanceMeters).toBe('number');
    expect(typeof approaching.eta).toBe('number');

    // Distance should be approximately 1km (within reasonable range)
    expect(approaching.distanceMeters).toBeGreaterThan(800);
    expect(approaching.distanceMeters).toBeLessThan(1200);
    
    // ETA should be reasonable (within 5 minutes for 1km)
    expect(approaching.eta).toBeGreaterThan(0);
    expect(approaching.eta).toBeLessThan(5);

    // Verify metadata
    expect(result.metadata).toMatchObject({
      apiCalls: expect.any(Number),
      executionTime: expect.any(Number),
      dataFreshness: expect.any(String),
      dataSource: 'realtime'
    });

    // Verify API calls were made correctly
    expect(mockPtvClient.findTrainStops).toHaveBeenCalledWith('Flinders Street');
    expect(mockPtvClient.getDirectionsForRoute).toHaveBeenCalledWith(2);
    expect(mockPtvClient.getRuns).toHaveBeenCalledWith(2, ROUTE_TYPE.TRAIN, expect.objectContaining({
      direction_id: expect.any(Number)
    }));
  });

  it('should filter by specific direction when provided', async () => {
    mockPtvClient.findTrainStops.mockResolvedValue([
      createMockStopResponse()
    ]);

    mockPtvClient.getDirectionsForRoute.mockResolvedValue({
      directions: [
        { direction_id: 1, direction_name: 'City (Flinders Street)' },
        { direction_id: 2, direction_name: 'Hurstbridge' }
      ]
    });

    // Only return vehicle for the inbound (city) direction
    mockPtvClient.getRuns.mockResolvedValue({
      runs: [{
        run_ref: 'run-124',
        route_id: 2,
        direction_id: 1,
        destination_name: 'Flinders Street',
        vehicle_position: {
          latitude: -37.8000,
          longitude: 144.9671,
          datetime_utc: new Date().toISOString(),
        }
      }]
    });

    const tool = new HowFarTool(mockPtvClient as any);
    
    const result = await tool.execute({
      stop: 'Flinders Street', 
      route: 'Hurstbridge',
      direction: 'inbound' // Should match city direction
    });

    expect(result.data.direction).toEqual({
      id: 1,
      name: 'City (Flinders Street)'
    });
    
    expect(result.data.approachingTrains).toHaveLength(1);
    expect(result.data.approachingTrains[0].destination).toBe('Flinders Street');
    expect(result.metadata.dataSource).toBe('realtime');
  });

  it('should fall back to schedule-based estimate when no vehicle positions available', async () => {
    mockPtvClient.findTrainStops.mockResolvedValue([
      createMockStopResponse()
    ]);

    mockPtvClient.getDirectionsForRoute.mockResolvedValue({
      directions: [{ direction_id: 1, direction_name: 'Up' }]
    });

    // Mock runs without vehicle positions
    mockPtvClient.getRuns.mockResolvedValue({
      runs: [{
        run_ref: 'run-125',
        route_id: 2,
        direction_id: 1,
        destination_name: 'Hurstbridge',
        // No vehicle_position data
      }]
    });

    // Mock departures for schedule fallback
    mockPtvClient.getDepartures.mockResolvedValue({
      departures: [{
        run_ref: 'run-126',
        scheduled_departure_utc: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 mins from now
        estimated_departure_utc: new Date(Date.now() + 16 * 60 * 1000).toISOString(),  // 16 mins from now
        route_id: 2,
        direction_id: 1,
      }],
      runs: {
        'run-126': {
          destination_name: 'Hurstbridge'
        }
      }
    });

    const tool = new HowFarTool(mockPtvClient as any);
    
    const result = await tool.execute({
      stop: 'Flinders Street',
      route: 'Hurstbridge',
    });

    expect(result.data.approachingTrains).toHaveLength(1);
    const approachingTrain = result.data.approachingTrains[0];
    
    expect(approachingTrain).toMatchObject({
      runRef: 'run-126',
      destination: 'Hurstbridge',
      accuracy: 'estimated'
    });

    // Should not have real-time position data
    expect(approachingTrain.realTimePosition).toBeUndefined();
    
    // Metadata should indicate estimated source
    expect(result.metadata.dataSource).toBe('estimated');
    
    // Should have made fallback calls to get departures
    expect(mockPtvClient.getDepartures).toHaveBeenCalled();
  });

  it('should handle stop not found error', async () => {
    mockPtvClient.findTrainStops.mockResolvedValue([]);

    const tool = new HowFarTool(mockPtvClient as any);

    await expect(tool.execute({
      stop: 'Non Existent Station',
      route: 'Hurstbridge'
    })).rejects.toThrow('Stop "Non Existent Station" not found');
  });

  it('should handle route not found at stop error', async () => {
    mockPtvClient.findTrainStops.mockResolvedValue([
      createMockStopResponse({
        routes: [
          { route_id: 99, route_name: 'Different Line', route_type: ROUTE_TYPE.TRAIN }
        ]
      })
    ]);

    // Mock getAllTrainRoutes fallback
    mockPtvClient.getAllTrainRoutes.mockResolvedValue({
      routes: [
        { route_id: 99, route_name: 'Different Line', route_type: ROUTE_TYPE.TRAIN }
      ]
    });

    const tool = new HowFarTool(mockPtvClient as any);

    await expect(tool.execute({
      stop: 'Flinders Street',
      route: 'Nonexistent Line'
    })).rejects.toThrow('Route "Nonexistent Line" not found at stop Flinders Street');
  });

  it('should handle invalid direction error', async () => {
    mockPtvClient.findTrainStops.mockResolvedValue([
      createMockStopResponse()
    ]);

    mockPtvClient.getDirectionsForRoute.mockResolvedValue({
      directions: [
        { direction_id: 1, direction_name: 'Up' },
        { direction_id: 2, direction_name: 'Down' }
      ]
    });

    const tool = new HowFarTool(mockPtvClient as any);

    await expect(tool.execute({
      stop: 'Flinders Street',
      route: 'Hurstbridge',
      direction: 'sideways' // Invalid direction
    })).rejects.toThrow('Direction "sideways" not found for route Hurstbridge');
  });

  it('should handle no approaching trains found', async () => {
    mockPtvClient.findTrainStops.mockResolvedValue([
      createMockStopResponse()
    ]);

    mockPtvClient.getDirectionsForRoute.mockResolvedValue({
      directions: [{ direction_id: 1, direction_name: 'Up' }]
    });

    // Mock empty runs response
    mockPtvClient.getRuns.mockResolvedValue({
      runs: [] // No runs available
    });

    // Mock empty departures fallback  
    mockPtvClient.getDepartures.mockResolvedValue({
      departures: [] // No departures available
    });

    const tool = new HowFarTool(mockPtvClient as any);

    await expect(tool.execute({
      stop: 'Flinders Street',
      route: 'Hurstbridge',
    })).rejects.toThrow('No approaching trains found for Hurstbridge at Flinders Street');
  });

  it('should calculate distance correctly using Haversine formula', async () => {
    mockPtvClient.findTrainStops.mockResolvedValue([
      createMockStopResponse()
    ]);

    mockPtvClient.getDirectionsForRoute.mockResolvedValue({
      directions: [{ direction_id: 1, direction_name: 'Up' }]
    });

    // Vehicle about 2km away (approximate)
    mockPtvClient.getRuns.mockResolvedValue({
      runs: [{
        run_ref: 'run-127',
        route_id: 2,
        direction_id: 1,
        destination_name: 'Hurstbridge',
        vehicle_position: {
          latitude: -37.8000, // About 2km north
          longitude: 144.9671,
          datetime_utc: new Date().toISOString(),
        }
      }]
    });

    const tool = new HowFarTool(mockPtvClient as any);
    
    const result = await tool.execute({
      stop: 'Flinders Street',
      route: 'Hurstbridge',
    });

    // Distance should be approximately 2km
    expect(result.data.approachingTrains).toHaveLength(1);
    const train = result.data.approachingTrains[0];
    
    expect(train.distanceMeters).toBeGreaterThan(1800);
    expect(train.distanceMeters).toBeLessThan(2200);
    
    // ETA should be approximately 2-3 minutes for 2km at 45km/h average
    expect(train.eta).toBeGreaterThan(1);
    expect(train.eta).toBeLessThan(4);
  });

  it('should find closest approaching vehicle when multiple vehicles available', async () => {
    mockPtvClient.findTrainStops.mockResolvedValue([
      createMockStopResponse()
    ]);

    mockPtvClient.getDirectionsForRoute.mockResolvedValue({
      directions: [{ direction_id: 1, direction_name: 'Up' }]
    });

    // Multiple vehicles at different distances
    mockPtvClient.getRuns.mockResolvedValue({
      runs: [
        {
          run_ref: 'run-far',
          route_id: 2,
          direction_id: 1,
          destination_name: 'Hurstbridge',
          vehicle_position: {
            latitude: -37.8000, // 2km away
            longitude: 144.9671,
            datetime_utc: new Date().toISOString(),
          }
        },
        {
          run_ref: 'run-close',
          route_id: 2,
          direction_id: 1,
          destination_name: 'Hurstbridge',
          vehicle_position: {
            latitude: -37.8150, // 500m away
            longitude: 144.9671,
            datetime_utc: new Date().toISOString(),
          }
        }
      ]
    });

    const tool = new HowFarTool(mockPtvClient as any);
    
    const result = await tool.execute({
      stop: 'Flinders Street',
      route: 'Hurstbridge',
    });

    // Should return the closest vehicle
    expect(result.data.approachingTrains).toHaveLength(1);
    const closestTrain = result.data.approachingTrains[0];
    
    expect(closestTrain.runRef).toBe('run-close');
    
    // Distance should be approximately 500m
    expect(closestTrain.distanceMeters).toBeLessThan(800);
  });
});
