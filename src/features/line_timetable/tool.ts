/*
  Line Timetable Tool - Get timetable for a specific stop and route
  Shows upcoming departures for the next 60 minutes with real-time data
*/

import { PtvClient } from '../../ptv/client';
import { ROUTE_TYPE } from '../../ptv/types';
import { normalizeDirection } from '../../utils/normalize-direction';
import type { 
  ResultStop, 
  ResultRoute, 
  DepartureItem, 
  DisruptionItem,
  ExpandedRun,
  ExpandedDirection,
} from '../../ptv/types';

export interface LineTimetableInput {
  stop: string;
  route: string;
  direction?: string; // Optional direction name or 'inbound'/'outbound'
  duration?: number; // Minutes ahead to show (default 60)
}

export interface LineTimetableOutput {
  stop?: {
    id: number;
    name: string;
    suburb?: string | undefined;
  };
  route?: {
    id: number;
    name: string;
    number?: string | undefined;
  };
  direction?: {
    id: number;
    name: string;
  } | undefined;
  departures?: {
    scheduled: string;
    estimated?: string | null | undefined;
    platform?: string | null | undefined;
    runRef?: string | undefined;
    atPlatform?: boolean | undefined;
    destination?: string | undefined;
  }[];
  disruptions?: {
    id: number;
    title: string;
    description?: string | undefined;
    url?: string | undefined;
  }[];
  timeWindow?: {
    start: string;
    end: string;
    durationMinutes: number;
  };
}

export const lineTimetableSchema = {
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
      description: 'Direction name or "inbound"/"outbound" (optional, shows all if omitted)' 
    },
    duration: { 
      type: 'number', 
      minimum: 15, 
      maximum: 180, 
      description: 'Duration in minutes to show departures (default 60, max 180)' 
    },
  },
  additionalProperties: false,
} as const;

interface ToolError extends Error {
  code: string;
  status?: number | undefined;
}

export class LineTimetableTool {
  constructor(private client = new PtvClient()) {}

  async execute(input: LineTimetableInput): Promise<{ data: LineTimetableOutput; metadata: Record<string, unknown> }> {
    const started = Date.now();
    let apiCalls = 0;
    let cacheHits = 0;

    const duration = Math.min(input.duration || 60, 180); // Cap at 3 hours
    const endTime = new Date(Date.now() + duration * 60 * 1000);

    try {
      console.log(`🚉 Getting timetable: ${input.stop} → ${input.route} (${duration} mins)`);

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
      const normalizedDirection = normalizeDirection(input.direction);
      if (normalizedDirection) {
        targetDirections = targetDirections.filter(dir => {
          const dirName = dir.direction_name?.toLowerCase() || '';
          return dirName.includes(normalizedDirection) || 
                 (normalizedDirection === 'inbound' && (dirName.includes('city') || dirName.includes('up'))) ||
                 (normalizedDirection === 'outbound' && (dirName.includes('down') || !dirName.includes('city')));
        });

        if (targetDirections.length === 0) {
          throw this.createError('DIRECTION_NOT_FOUND', `Direction "${input.direction}" not found for route ${matchingRoute.route_name}`, 404);
        }
      }

      console.log(`🧭 Using ${targetDirections.length} direction(s):`, targetDirections.map(d => d.direction_name));

      // Step 4: Get departures for each direction
      const allDepartures: Array<{
        departure: DepartureItem;
        direction: ExpandedDirection;
        run: ExpandedRun;
      }> = [];

      for (const direction of targetDirections) {
        try {
          const departureOptions: any = {
            route_id: matchingRoute.route_id!,
            direction_id: direction.direction_id,
            max_results: 20, // More results to cover the time window
            date_utc: new Date().toISOString(),
          };

          const departures = await this.client.getDepartures(
            matchingRoute.route_type!,
            stop.stop_id!,
            departureOptions
          );
          apiCalls += 1;

          if (departures.departures && departures.departures.length > 0) {
            // Filter departures within time window
            const validDepartures = departures.departures.filter(dep => {
              if (!dep.scheduled_departure_utc) return false;
              const depTime = new Date(dep.scheduled_departure_utc);
              return depTime <= endTime && depTime >= new Date();
            });

            validDepartures.forEach(dep => {
              allDepartures.push({
                departure: dep,
                direction: departures.directions![direction.direction_id.toString()]!,
                run: departures.runs![dep.run_ref!]!,
              });
            });
          }
        } catch (error: any) {
          console.log(`⚠️  Direction ${direction.direction_name} failed:`, error.message);
        }
      }

      if (allDepartures.length === 0) {
        throw this.createError('NO_DEPARTURES', `No departures found for ${matchingRoute.route_name} at ${stop.stop_name} in the next ${duration} minutes`, 404);
      }

      // Step 5: Sort departures by scheduled time
      allDepartures.sort((a, b) => 
        new Date(a.departure.scheduled_departure_utc!).getTime() - 
        new Date(b.departure.scheduled_departure_utc!).getTime()
      );

      console.log(`🚂 Found ${allDepartures.length} departures in the next ${duration} minutes`);

      // Step 6: Get disruptions for this route
      const disruptions = await this.getRelevantDisruptions(matchingRoute.route_id!, matchingRoute.route_type);
      apiCalls += 1;

      // Step 7: Build response
      const result: LineTimetableOutput = {
        stop: {
          id: stop.stop_id!,
          name: stop.stop_name!,
          suburb: stop.stop_suburb,
        },
        route: {
          id: matchingRoute.route_id!,
          name: matchingRoute.route_name!,
          number: matchingRoute.route_number,
        },
        direction: targetDirections.length === 1 ? {
          id: targetDirections[0]!.direction_id!,
          name: targetDirections[0]!.direction_name!,
        } : undefined,
        departures: allDepartures.map(({ departure, run }) => ({
          scheduled: departure.scheduled_departure_utc!,
          estimated: departure.estimated_departure_utc,
          platform: departure.platform_number,
          runRef: departure.run_ref,
          atPlatform: departure.at_platform,
          destination: run.destination_name,
        })),
        disruptions: disruptions.map(d => ({
          id: d.disruption_id!,
          title: d.title!,
          description: d.description || undefined,
          url: d.url || undefined,
        })),
        timeWindow: {
          start: new Date().toISOString(),
          end: endTime.toISOString(),
          durationMinutes: duration,
        },
      };

      return {
        data: result,
        metadata: {
          executionTime: Date.now() - started,
          apiCalls,
          cacheHits,
          dataFreshness: new Date().toISOString(),
          departuresFound: allDepartures.length,
          directionsConsidered: targetDirections.length,
        },
      };

    } catch (error: any) {
      console.error('❌ LineTimetable error:', error);
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

    // Fallback: search all train routes (both metro and V/Line)
    const allRoutes = await this.client.getAllTrainRoutes();
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
   * Get relevant disruptions for a route (both metro and regional)
   */
  private async getRelevantDisruptions(routeId: number, routeType?: number): Promise<DisruptionItem[]> {
    try {
      const disruptions = await this.client.getDisruptionsByRoute(routeId);
      const allDisruptions = [
        ...(disruptions.disruptions?.metro_train || []),
        ...(disruptions.disruptions?.regional_train || []),
      ];
      return allDisruptions;
    } catch (error: any) {
      console.log('⚠️  Could not fetch disruptions:', error.message);
      return [];
    }
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
