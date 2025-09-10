/*
  How Far Tool - Estimate distance and ETA for approaching trains
  Uses real-time vehicle positions or schedule-based estimates
*/

import { PtvClient } from '../../ptv/client';
import { ROUTE_TYPE } from '../../ptv/types';
import { getTimezoneDebugInfo } from '../../utils/melbourne-time';
import type { 
  ResultStop, 
  ResultRoute, 
  VehicleRun,
} from '../../ptv/types';

export interface HowFarInput {
  stop: string;
  route: string;
  direction?: string; // Optional direction name or 'inbound'/'outbound'
}

export interface HowFarOutput {
  stop?: {
    id: number;
    name: string;
    suburb?: string | undefined;
    coordinates?: {
      latitude: number;
      longitude: number;
    } | undefined;
  };
  route?: {
    id: number;
    name: string;
    number?: string | undefined;
  };
  direction?: {
    id: number;
    name: string;
  };
  approachingTrains: {
    runRef: string;
    destination?: string | undefined;
    distanceMeters: number;
    eta: number;
    accuracy: 'realtime' | 'estimated';
    vehicle?: {
      id?: string | undefined;
      operator?: string | undefined;
      description?: string | undefined;
      lowFloor?: boolean | undefined;
      airConditioned?: boolean | undefined;
    } | undefined;
    realTimePosition?: {
      latitude: number;
      longitude: number;
      bearing?: number | undefined;
      lastUpdated: string;
    } | undefined;
    scheduledArrival?: {
      scheduled: string;
      estimated?: string | null | undefined;
      platform?: string | null | undefined;
    };
  }[];
}

export const howFarSchema = {
  type: 'object',
  required: ['stop', 'route'],
  properties: {
    stop: { 
      type: 'string', 
      description: 'Stop name (e.g., "Flinders Street", "Southern Cross")' 
    },
    route: { 
      type: 'string', 
      description: 'Route name or number (e.g., "Hurstbridge", "Belgrave")' 
    },
    direction: { 
      type: 'string', 
      description: 'Direction name or "inbound"/"outbound" (optional, finds closest approaching if omitted)' 
    },
  },
  additionalProperties: false,
} as const;

interface ToolError extends Error {
  code: string;
  status?: number | undefined;
}

export class HowFarTool {
  constructor(private client = new PtvClient()) {}

  async execute(input: HowFarInput): Promise<{ data: HowFarOutput; metadata: Record<string, unknown> }> {
    const started = Date.now();
    let apiCalls = 0;
    let cacheHits = 0;

    try {
      console.log(`🚄 How far: ${input.route} approaching ${input.stop}`);

      // Step 1: Resolve stop
      const stops = await this.client.findTrainStops(input.stop);
      apiCalls += 1;

      if (stops.length === 0) {
        throw this.createError('STOP_NOT_FOUND', `Stop "${input.stop}" not found`, 404);
      }

      const stop = stops[0]!;
      console.log(`✅ Resolved stop: ${stop.stop_name} (${stop.stop_id})`);

      // Step 2: Find matching route at this stop
      const matchingRoute = await this.findRouteAtStop(stop, input.route);
      apiCalls += 1; // May use cached routes or require API call

      if (!matchingRoute) {
        throw this.createError('ROUTE_NOT_FOUND', `Route "${input.route}" not found at stop ${stop.stop_name}`, 404);
      }

      console.log(`✅ Found route: ${matchingRoute.route_name} (${matchingRoute.route_id})`);

      // Step 3: Get directions for the route (if direction specified)
      const directions = await this.client.getDirectionsForRoute(matchingRoute.route_id!);
      apiCalls += 1;

      let targetDirections = directions.directions || [];
      
      // Filter by direction if specified
      if (input.direction) {
        const directionFilter = input.direction.toLowerCase();
        targetDirections = targetDirections.filter(dir => {
          const dirName = dir.direction_name?.toLowerCase() || '';
          return dirName.includes(directionFilter) || 
                 (directionFilter === 'inbound' && (dirName.includes('city') || dirName.includes('up'))) ||
                 (directionFilter === 'outbound' && (dirName.includes('down') || !dirName.includes('city')));
        });

        if (targetDirections.length === 0) {
          throw this.createError('DIRECTION_NOT_FOUND', `Direction "${input.direction}" not found for route ${matchingRoute.route_name}`, 404);
        }
      }

      console.log(`🧭 Searching ${targetDirections.length} direction(s):`, targetDirections.map(d => d.direction_name));

      // Step 4: Get runs with vehicle position data
      let closestApproaching: {
        run: VehicleRun;
        direction: any;
        distance?: number | undefined;
        eta?: number | undefined;
        accuracy: 'realtime' | 'estimated';
      } | null = null;

      for (const direction of targetDirections) {
        try {
          // Get runs for this route and direction with vehicle positions
          const runsResponse = await this.client.getRuns(
            matchingRoute.route_id!,
            ROUTE_TYPE.TRAIN,
            { direction_id: direction.direction_id }
          );
          apiCalls += 1;

          if (runsResponse.runs && runsResponse.runs.length > 0) {
            for (const run of runsResponse.runs) {
              // Check if this run has real-time position data
              if (run.vehicle_position?.latitude && run.vehicle_position?.longitude) {
                const { distance, eta } = this.calculateDistanceAndEta(
                  {
                    latitude: run.vehicle_position.latitude,
                    longitude: run.vehicle_position.longitude,
                  },
                  {
                    latitude: stop.stop_latitude || 0,
                    longitude: stop.stop_longitude || 0,
                  },
                  run.vehicle_position.bearing
                );

                console.log(`🚂 Found vehicle for run ${run.run_ref}: ${distance}m away, ${eta}min ETA`);

                // Use the closest approaching train
                if (!closestApproaching || distance < (closestApproaching.distance || Infinity)) {
                  closestApproaching = {
                    run,
                    direction,
                    distance,
                    eta,
                    accuracy: 'realtime'
                  };
                }
              }
            }
          }
        } catch (error: any) {
          console.log(`⚠️  Direction ${direction.direction_name} failed:`, error.message);
          // 403 errors are common for runs endpoint - this is expected and we'll fall back to schedule
        }
      }

      // Step 5: Fallback to schedule-based estimate if no real-time data
      if (!closestApproaching) {
        console.log(`📅 No real-time data found, falling back to schedule estimate`);
        const scheduleBased = await this.getScheduleBasedEstimate(
          stop,
          matchingRoute,
          targetDirections
        );
        apiCalls += targetDirections.length; // Departure queries

        if (scheduleBased) {
          closestApproaching = scheduleBased;
        }
      }

      if (!closestApproaching) {
        throw this.createError('NO_APPROACHING_TRAINS', `No approaching trains found for ${matchingRoute.route_name} at ${stop.stop_name}`, 404);
      }

      // Step 6: Build response
      const approachingTrain = {
        runRef: closestApproaching.run.run_ref!,
        destination: closestApproaching.run.destination_name,
        distanceMeters: Math.round(closestApproaching.distance || 0),
        eta: Math.round((closestApproaching.eta || 0) * 100) / 100, // Round to 2 decimal places
        accuracy: closestApproaching.accuracy,
        vehicle: closestApproaching.run.vehicle_descriptor ? {
          id: closestApproaching.run.vehicle_descriptor.id,
          operator: closestApproaching.run.vehicle_descriptor.operator,
          description: closestApproaching.run.vehicle_descriptor.description,
          lowFloor: closestApproaching.run.vehicle_descriptor.low_floor,
          airConditioned: closestApproaching.run.vehicle_descriptor.air_conditioned,
        } : undefined,
        realTimePosition: (closestApproaching.distance !== undefined && closestApproaching.run.vehicle_position) ? {
          latitude: closestApproaching.run.vehicle_position.latitude!,
          longitude: closestApproaching.run.vehicle_position.longitude!,
          bearing: closestApproaching.run.vehicle_position.bearing,
          lastUpdated: closestApproaching.run.vehicle_position.datetime_utc!,
        } : undefined,
      };
      
      const result: HowFarOutput = {
        stop: {
          id: stop.stop_id!,
          name: stop.stop_name!,
          suburb: stop.stop_suburb,
          coordinates: (stop.stop_latitude && stop.stop_longitude) ? {
            latitude: stop.stop_latitude,
            longitude: stop.stop_longitude,
          } : undefined,
        },
        route: {
          id: matchingRoute.route_id!,
          name: matchingRoute.route_name!,
          number: matchingRoute.route_number,
        },
        direction: {
          id: closestApproaching.direction.direction_id,
          name: closestApproaching.direction.direction_name,
        },
        approachingTrains: [approachingTrain],
      };

      return {
        data: result,
        metadata: {
          executionTime: Date.now() - started,
          apiCalls,
          cacheHits,
          dataFreshness: new Date().toISOString(),
          dataSource: closestApproaching.accuracy,
          timezone: getTimezoneDebugInfo(),
        },
      };

    } catch (error: any) {
      console.error('❌ HowFar error:', error);
      throw error;
    }
  }

  /**
   * Find a route that services the given stop
   */
  private async findRouteAtStop(stop: ResultStop, routeName: string): Promise<ResultRoute | null> {
    // First check routes associated with the stop
    const stopRoutes = stop.routes || [];
    
    // Try exact match first
    let matchingRoute = stopRoutes.find(route => 
      route.route_name?.toLowerCase() === routeName.toLowerCase() ||
      route.route_number?.toLowerCase() === routeName.toLowerCase()
    );

    if (matchingRoute) {
      return matchingRoute;
    }

    // Try partial match
    matchingRoute = stopRoutes.find(route => 
      route.route_name?.toLowerCase().includes(routeName.toLowerCase()) ||
      route.route_number?.toLowerCase().includes(routeName.toLowerCase())
    );

    if (matchingRoute) {
      return matchingRoute;
    }

    // Fallback: search all train routes
    const allRoutes = await this.client.getRoutes(ROUTE_TYPE.TRAIN);
    const trainRoutes = allRoutes.routes || [];

    // Try exact match in all routes
    matchingRoute = trainRoutes.find(route => 
      route.route_name?.toLowerCase() === routeName.toLowerCase() ||
      route.route_number?.toLowerCase() === routeName.toLowerCase()
    );

    if (matchingRoute) {
      return matchingRoute;
    }

    // Try partial match in all routes
    matchingRoute = trainRoutes.find(route => 
      route.route_name?.toLowerCase().includes(routeName.toLowerCase()) ||
      route.route_number?.toLowerCase().includes(routeName.toLowerCase())
    );

    return matchingRoute || null;
  }

  /**
   * Calculate distance and ETA using Haversine formula
   */
  private calculateDistanceAndEta(
    vehiclePos: { latitude: number; longitude: number },
    stopPos: { latitude: number; longitude: number },
_bearing?: number
  ): { distance: number; eta: number } {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = vehiclePos.latitude * Math.PI / 180;
    const lat2Rad = stopPos.latitude * Math.PI / 180;
    const deltaLat = (stopPos.latitude - vehiclePos.latitude) * Math.PI / 180;
    const deltaLon = (stopPos.longitude - vehiclePos.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distance = R * c; // Distance in meters

    // Estimate ETA based on average train speed (45 km/h in metro areas)
    const averageSpeedKmh = 45;
    const averageSpeedMs = averageSpeedKmh * 1000 / 3600;
    const eta = distance / averageSpeedMs / 60; // Convert to minutes

    return { distance, eta };
  }

  /**
   * Get schedule-based estimate when no real-time data is available
   */
  private async getScheduleBasedEstimate(
    stop: ResultStop,
    route: ResultRoute,
    directions: any[]
  ): Promise<{
    run: VehicleRun;
    direction: any;
    distance?: number | undefined;
    eta: number;
    accuracy: 'estimated';
  } | null> {
    for (const direction of directions) {
      try {
        const departures = await this.client.getDepartures(
          ROUTE_TYPE.TRAIN,
          stop.stop_id!,
          {
            route_id: route.route_id!,
            direction_id: direction.direction_id,
            max_results: 3,
          }
        );

        if (departures.departures && departures.departures.length > 0) {
          // Find the next departure
          const nextDeparture = departures.departures
            .filter(dep => new Date(dep.scheduled_departure_utc!) > new Date())
            .sort((a, b) => 
              new Date(a.scheduled_departure_utc!).getTime() - 
              new Date(b.scheduled_departure_utc!).getTime()
            )[0];

          if (nextDeparture) {
            const etaMs = new Date(nextDeparture.estimated_departure_utc || nextDeparture.scheduled_departure_utc!).getTime() - Date.now();
            const etaMinutes = Math.max(0, etaMs / 1000 / 60);

            // Create a mock VehicleRun from the departure data
            const mockRun: VehicleRun = {
              run_ref: nextDeparture.run_ref!,
              route_id: route.route_id!,
              route_type: ROUTE_TYPE.TRAIN,
              direction_id: direction.direction_id,
              destination_name: departures.runs?.[nextDeparture.run_ref!]?.destination_name || route.route_name || 'Unknown',
            };

            return {
              run: mockRun,
              direction,
              distance: undefined,
              eta: etaMinutes,
              accuracy: 'estimated'
            };
          }
        }
      } catch (error: any) {
        console.log(`⚠️  Schedule estimate for ${direction.direction_name} failed:`, error.message);
      }
    }

    return null;
  }

  /**
   * Create a structured error
   */
  private createError(code: string, message: string, status?: number): ToolError {
    const error = new Error(message) as ToolError;
    error.code = code;
    if (status) {
      error.status = status;
    }
    return error;
  }
}
