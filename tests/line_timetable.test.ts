/*
  Integration tests for LineTimetableTool
  Tests timetable retrieval with realistic mock scenarios
*/

import { LineTimetableTool } from '@/features/line_timetable/tool';
import { ROUTE_TYPE } from '@/ptv/types';

// Mock PTV client
const createMockPTVClient = () => ({
  findTrainStops: jest.fn(),
  getDirectionsForRoute: jest.fn(),
  getDepartures: jest.fn(),
  getDisruptionsByRoute: jest.fn(),
  getRoutes: jest.fn(),
});

const createMockSearchResponse = (stops: any[]) => stops;

const createMockStopResponse = (overrides = {}) => ({
  stop_id: 1071,
  stop_name: 'Flinders Street',
  stop_suburb: 'Melbourne',
  route_type: ROUTE_TYPE.TRAIN,
  routes: [
    { route_id: 2, route_name: 'Hurstbridge', route_number: 'Hurstbridge', route_type: ROUTE_TYPE.TRAIN },
    { route_id: 3, route_name: 'Belgrave', route_number: 'Belgrave', route_type: ROUTE_TYPE.TRAIN }
  ],
  ...overrides,
});

describe('LineTimetable Tool Integration', () => {
  let mockPtvClient: ReturnType<typeof createMockPTVClient>;

  beforeEach(() => {
    mockPtvClient = createMockPTVClient();
    jest.clearAllMocks();
  });

  it('should get timetable for Flinders Street → Hurstbridge line', async () => {
    // Mock stop resolution
    mockPtvClient.findTrainStops.mockResolvedValue([
      createMockSearchResponse([createMockStopResponse()])[0]
    ]);

    // Mock directions
    mockPtvClient.getDirectionsForRoute.mockResolvedValue({
      directions: [
        { direction_id: 1, direction_name: 'Up' },
        { direction_id: 2, direction_name: 'Down' }
      ]
    });

    // Mock departures with multiple trains
    mockPtvClient.getDepartures.mockResolvedValue({
      departures: [
        {
          run_ref: 'run-123',
          scheduled_departure_utc: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 mins from now
          estimated_departure_utc: new Date(Date.now() + 16 * 60 * 1000).toISOString(), // 16 mins from now
          platform_number: '2',
          at_platform: false,
          route_id: 2,
          direction_id: 1,
          stop_id: 1071
        },
        {
          run_ref: 'run-124',
          scheduled_departure_utc: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 mins from now
          estimated_departure_utc: new Date(Date.now() + 31 * 60 * 1000).toISOString(), // 31 mins from now
          platform_number: '2',
          at_platform: false,
          route_id: 2,
          direction_id: 1,
          stop_id: 1071
        }
      ],
      routes: {
        '2': {
          route_id: 2,
          route_name: 'Hurstbridge',
          route_number: 'Hurstbridge'
        }
      },
      directions: {
        '1': {
          direction_id: 1,
          direction_name: 'Up'
        }
      },
      runs: {
        'run-123': {
          run_ref: 'run-123',
          destination_name: 'Hurstbridge'
        },
        'run-124': {
          run_ref: 'run-124',
          destination_name: 'Hurstbridge'
        }
      }
    });

    // Mock disruptions
    mockPtvClient.getDisruptionsByRoute.mockResolvedValue({
      disruptions: {
        metro_train: []
      }
    });

    const tool = new LineTimetableTool(mockPtvClient as any);
    
    const result = await tool.execute({
      stop: 'Flinders Street',
      route: 'Hurstbridge',
      duration: 60
    });

    // Verify the response structure
    expect(result.data.stop).toMatchObject({
      id: 1071,
      name: 'Flinders Street',
      suburb: 'Melbourne'
    });
    expect(result.data.route).toMatchObject({
      id: 2,
      name: 'Hurstbridge',
      number: 'Hurstbridge'
    });
    expect(result.data.timeWindow).toMatchObject({
      durationMinutes: 60
    });

    // Should have multiple departures from both directions
    expect(Array.isArray(result.data.departures)).toBe(true);
    expect(result.data.departures!.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(result.data.disruptions)).toBe(true);
    
    // Verify departure structure
    expect(result.data.departures?.[0]).toMatchObject({
      scheduled: expect.any(String),
      estimated: expect.any(String),
      platform: '2',
      atPlatform: false,
      destination: 'Hurstbridge'
    });

    // Verify metadata
    expect(result.metadata).toMatchObject({
      apiCalls: expect.any(Number),
      executionTime: expect.any(Number),
      dataFreshness: expect.any(String),
      departuresFound: expect.any(Number),
      directionsConsidered: expect.any(Number)
    });

    // Verify API calls were made correctly
    expect(mockPtvClient.findTrainStops).toHaveBeenCalledWith('Flinders Street');
    expect(mockPtvClient.getDirectionsForRoute).toHaveBeenCalledWith(2);
    expect(mockPtvClient.getDepartures).toHaveBeenCalled();
    expect(mockPtvClient.getDisruptionsByRoute).toHaveBeenCalledWith(2);
  });

  it('should filter by specific direction', async () => {
    // Mock stop with routes
    mockPtvClient.findTrainStops.mockResolvedValue([
      createMockSearchResponse([createMockStopResponse()])[0]
    ]);

    // Mock directions with city-bound and outbound
    mockPtvClient.getDirectionsForRoute.mockResolvedValue({
      directions: [
        { direction_id: 1, direction_name: 'City (Flinders Street)' },
        { direction_id: 2, direction_name: 'Hurstbridge' }
      ]
    });

    // Mock departures - should only get city direction
    mockPtvClient.getDepartures.mockResolvedValue({
      departures: [
        {
          run_ref: 'run-125',
          scheduled_departure_utc: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // 45 mins from now
          estimated_departure_utc: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // 45 mins from now
          platform_number: '3',
          at_platform: true,
          route_id: 2,
          direction_id: 1,
          stop_id: 1071
        }
      ],
      routes: {
        '2': { route_id: 2, route_name: 'Hurstbridge', route_number: 'Hurstbridge' }
      },
      directions: {
        '1': { direction_id: 1, direction_name: 'City (Flinders Street)' }
      },
      runs: {
        'run-125': { run_ref: 'run-125', destination_name: 'Flinders Street' }
      }
    });

    mockPtvClient.getDisruptionsByRoute.mockResolvedValue({
      disruptions: { metro_train: [] }
    });

    const tool = new LineTimetableTool(mockPtvClient as any);
    
    const result = await tool.execute({
      stop: 'Flinders Street',
      route: 'Hurstbridge',
      direction: 'inbound', // Should match city direction
      duration: 60
    });

    // Verify only one direction was considered
    expect(result.metadata.directionsConsidered).toBe(1);
    expect(result.data.direction).toEqual({
      id: 1,
      name: 'City (Flinders Street)'
    });
  });

  it('should handle stop not found error', async () => {
    mockPtvClient.findTrainStops.mockResolvedValue([]);

    const tool = new LineTimetableTool(mockPtvClient as any);

    await expect(tool.execute({
      stop: 'Non Existent Station',
      route: 'Hurstbridge'
    })).rejects.toThrow('Stop "Non Existent Station" not found');
  });

  it('should handle route not found at stop error', async () => {
    // Mock stop that exists but doesn't have the requested route
    mockPtvClient.findTrainStops.mockResolvedValue([
      createMockSearchResponse([createMockStopResponse({
        routes: [
          { route_id: 99, route_name: 'Different Line', route_type: ROUTE_TYPE.TRAIN }
        ]
      })])[0]
    ]);

    // Mock getRoutes fallback (should not find the route either)
    mockPtvClient.getRoutes.mockResolvedValue({
      routes: [
        { route_id: 99, route_name: 'Different Line', route_type: ROUTE_TYPE.TRAIN }
      ]
    });

    const tool = new LineTimetableTool(mockPtvClient as any);

    await expect(tool.execute({
      stop: 'Flinders Street',
      route: 'Nonexistent Line'
    })).rejects.toThrow('Route "Nonexistent Line" not found at stop Flinders Street');
  });

  it('should handle invalid direction error', async () => {
    mockPtvClient.findTrainStops.mockResolvedValue([
      createMockSearchResponse([createMockStopResponse()])[0]
    ]);

    mockPtvClient.getDirectionsForRoute.mockResolvedValue({
      directions: [
        { direction_id: 1, direction_name: 'Up' },
        { direction_id: 2, direction_name: 'Down' }
      ]
    });

    const tool = new LineTimetableTool(mockPtvClient as any);

    await expect(tool.execute({
      stop: 'Flinders Street',
      route: 'Hurstbridge',
      direction: 'sideways' // Invalid direction
    })).rejects.toThrow('Direction "sideways" not found for route Hurstbridge');
  });

  it('should handle no departures in time window', async () => {
    mockPtvClient.findTrainStops.mockResolvedValue([
      createMockSearchResponse([createMockStopResponse()])[0]
    ]);

    mockPtvClient.getDirectionsForRoute.mockResolvedValue({
      directions: [{ direction_id: 1, direction_name: 'Up' }]
    });

    // Mock empty departures
    mockPtvClient.getDepartures.mockResolvedValue({
      departures: [] // No departures available
    });

    const tool = new LineTimetableTool(mockPtvClient as any);

    await expect(tool.execute({
      stop: 'Flinders Street',
      route: 'Hurstbridge',
      duration: 60
    })).rejects.toThrow('No departures found for Hurstbridge at Flinders Street in the next 60 minutes');
  });

  it('should respect custom duration parameter', async () => {
    mockPtvClient.findTrainStops.mockResolvedValue([
      createMockSearchResponse([createMockStopResponse()])[0]
    ]);

    mockPtvClient.getDirectionsForRoute.mockResolvedValue({
      directions: [{ direction_id: 1, direction_name: 'Up' }]
    });

    mockPtvClient.getDepartures.mockResolvedValue({
      departures: [
        {
          run_ref: 'run-126',
          scheduled_departure_utc: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
          route_id: 2,
          direction_id: 1
        }
      ],
      routes: { '2': { route_id: 2, route_name: 'Hurstbridge' } },
      directions: { '1': { direction_id: 1, direction_name: 'Up' } },
      runs: { 'run-126': { destination_name: 'Hurstbridge' } }
    });

    mockPtvClient.getDisruptionsByRoute.mockResolvedValue({
      disruptions: { metro_train: [] }
    });

    const tool = new LineTimetableTool(mockPtvClient as any);
    
    const result = await tool.execute({
      stop: 'Flinders Street',
      route: 'Hurstbridge',
      duration: 120 // 2 hours
    });

    expect(result.data.timeWindow?.durationMinutes).toBe(120);
  });

  it('should cap duration at maximum of 180 minutes', async () => {
    mockPtvClient.findTrainStops.mockResolvedValue([
      createMockSearchResponse([createMockStopResponse()])[0]
    ]);

    mockPtvClient.getDirectionsForRoute.mockResolvedValue({
      directions: [{ direction_id: 1, direction_name: 'Up' }]
    });

    mockPtvClient.getDepartures.mockResolvedValue({
      departures: [
        {
          run_ref: 'run-127',
          scheduled_departure_utc: new Date(Date.now() + 75 * 60 * 1000).toISOString(), // 1 hour 15 mins from now
          route_id: 2,
          direction_id: 1
        }
      ],
      routes: { '2': { route_id: 2, route_name: 'Hurstbridge' } },
      directions: { '1': { direction_id: 1, direction_name: 'Up' } },
      runs: { 'run-127': { destination_name: 'Hurstbridge' } }
    });

    mockPtvClient.getDisruptionsByRoute.mockResolvedValue({
      disruptions: { metro_train: [] }
    });

    const tool = new LineTimetableTool(mockPtvClient as any);
    
    const result = await tool.execute({
      stop: 'Flinders Street',
      route: 'Hurstbridge',
      duration: 300 // 5 hours - should be capped at 3 hours (180 mins)
    });

    expect(result.data.timeWindow?.durationMinutes).toBe(180);
  });
});
