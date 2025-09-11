/*
  Integration tests for next_train tool orchestration.
  Tests the full flow: Flinders Street to South Morang scenario with mocked PTV responses.
*/

import { describe, it, expect, mock } from 'bun:test';
import { NextTrainTool } from '@/features/next_train/tool';
import { ROUTE_TYPE } from '@/ptv/types';

// Mock PTV Client with realistic responses
const mockPtvClient = {
  findTrainStops: mock(),
  getRoutes: mock(),
  getAllTrainRoutes: mock(),
  getDirectionsForRoute: mock(), 
  getDepartures: mock(),
  getRunPattern: mock(),
  getDisruptionsByRoute: mock(),
  clearCaches: mock(),
  getCacheStats: mock(),
};

describe('NextTrain Tool Integration', () => {
  it('should find next train from Flinders Street to South Morang', async () => {
    // Mock realistic PTV API responses
    mockPtvClient.findTrainStops.mockImplementation((stopName: string) => {
      if (stopName === 'Flinders Street') {
        return Promise.resolve([{
          stop_id: 1071,
          stop_name: 'Flinders Street',
          stop_suburb: 'Melbourne',
          route_type: ROUTE_TYPE.TRAIN,
          routes: [
            { route_id: 2, route_name: 'Hurstbridge', route_type: ROUTE_TYPE.TRAIN }
          ]
        }]);
      }
      if (stopName === 'South Morang') {
        return Promise.resolve([{
          stop_id: 1155,
          stop_name: 'South Morang',
          stop_suburb: 'South Morang',
          route_type: ROUTE_TYPE.TRAIN,
          routes: [
            { route_id: 2, route_name: 'Hurstbridge', route_type: ROUTE_TYPE.TRAIN }
          ]
        }]);
      }
      return Promise.resolve([]);
    });

    mockPtvClient.getDirectionsForRoute.mockResolvedValue({
      directions: [
        { direction_id: 1, direction_name: 'Up' },
        { direction_id: 2, direction_name: 'Down' }
      ]
    });

    mockPtvClient.getDepartures.mockResolvedValue({
      departures: [{
        run_ref: 'run-123',
        scheduled_departure_utc: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes from now
        estimated_departure_utc: new Date(Date.now() + 16 * 60 * 1000).toISOString(),  // 16 minutes from now
        platform_number: '2',
        at_platform: false,
        route_id: 2,
        direction_id: 1,
        stop_id: 1071
      }],
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
        }
      }
    });

    mockPtvClient.getRunPattern.mockResolvedValue({
      departures: [
        { stop_id: 1071 }, // Flinders Street
        { stop_id: 1155 }, // South Morang (validates destination is serviced)
      ]
    });

    mockPtvClient.getDisruptionsByRoute.mockResolvedValue({
      disruptions: {
        metro_train: []
      }
    });

    const tool = new NextTrainTool(mockPtvClient as any);
    
    const result = await tool.execute({
      origin: 'Flinders Street',
      destination: 'South Morang'
    });

    // Verify the response structure
    expect(result.data).toMatchObject({
      route: {
        id: 2,
        name: 'Hurstbridge',
        number: 'Hurstbridge'
      },
      direction: {
        id: 1,
        name: 'Up'
      },
      departure: {
        scheduled: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.+Z$/), // Valid ISO timestamp
        estimated: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.+Z$/), // Valid ISO timestamp
        platform: '2',
        atPlatform: false
      },
      origin: {
        id: 1071,
        name: 'Flinders Street',
        suburb: 'Melbourne'
      },
      destination: {
        id: 1155,
        name: 'South Morang', 
        suburb: 'South Morang'
      },
      disruptions: [],
      journey: {
        changes: 0
      }
    });

    // Verify metadata structure and types
    expect(typeof result.metadata.apiCalls).toBe('number');
    expect(result.metadata.apiCalls).toBeGreaterThan(0);
    expect(typeof result.metadata.executionTime).toBe('number');
    expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
    expect(typeof result.metadata.dataFreshness).toBe('string');
    expect(typeof result.metadata.routesConsidered).toBe('number');
    expect(typeof result.metadata.departuresFound).toBe('number');
  });

  it('should handle stop not found error', async () => {
    mockPtvClient.findTrainStops.mockResolvedValue([]);

    const tool = new NextTrainTool(mockPtvClient as any);

    await expect(tool.execute({
      origin: 'Non Existent Station',
      destination: 'South Morang'
    })).rejects.toThrow('Origin stop \"Non Existent Station\" not found');
  });

  it('should handle no routes found error', async () => {
    mockPtvClient.findTrainStops.mockImplementation((stopName: string) => {
      return Promise.resolve([{
        stop_id: stopName === 'StopA' ? 1001 : 1002,
        stop_name: stopName,
        stop_suburb: 'Somewhere',
        route_type: ROUTE_TYPE.TRAIN,
        routes: [] // No common routes
      }]);
    });

    // Mock getAllTrainRoutes to return empty routes array for fallback
    mockPtvClient.getAllTrainRoutes.mockResolvedValue({
      routes: []
    });

    const tool = new NextTrainTool(mockPtvClient as any);

    await expect(tool.execute({
      origin: 'StopA',
      destination: 'StopB'
    })).rejects.toThrow('No train routes found connecting');
  });

  it('should handle no departures found error', async () => {
    // Setup stops with routes but no departures
    mockPtvClient.findTrainStops.mockImplementation(() => {
      return Promise.resolve([{
        stop_id: 1001,
        stop_name: 'Test Stop',
        route_type: ROUTE_TYPE.TRAIN,
        routes: [{ route_id: 1, route_name: 'Test Route', route_type: ROUTE_TYPE.TRAIN }]
      }]);
    });

    mockPtvClient.getDirectionsForRoute.mockResolvedValue({
      directions: [{ direction_id: 1, direction_name: 'Up' }]
    });

    // No departures available
    mockPtvClient.getDepartures.mockResolvedValue({
      departures: []
    });

    const tool = new NextTrainTool(mockPtvClient as any);

    await expect(tool.execute({
      origin: 'Test Stop A',
      destination: 'Test Stop B'
    })).rejects.toThrow('No upcoming train departures found for this journey');
  });
});
