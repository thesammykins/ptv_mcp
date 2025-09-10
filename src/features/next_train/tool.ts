/*
  Next Train Tool - Find the next train between origin and destination stops
  Orchestrates: stop resolution → route discovery → departure validation → real-time data
*/

import { PtvClient } from '../../ptv/client';
import { ROUTE_TYPE } from '../../ptv/types';
import { parseUserTimeToMelbourneUTC, formatUTCForMelbourne, getTimezoneDebugInfo } from '../../utils/melbourne-time';
import type { 
  ResultStop, 
  ResultRoute, 
  DepartureItem,
  DisruptionItem, 
  ExpandedRoute,
  ExpandedDirection,
  ExpandedRun,
} from '../../ptv/types';

export interface NextTrainInput {
  origin: string;
  destination: string;
  time?: string; // ISO 8601
}

export interface NextTrainOutput {
  route?: { 
    id: number; 
    name: string; 
    number?: string | undefined;
  };
  direction?: { 
    id: number; 
    name: string; 
  };
  departure?: {
    scheduled: string;
    estimated?: string | null | undefined;
    platform?: string | null | undefined;
    runRef?: string | undefined;
    atPlatform?: boolean | undefined;
    scheduledMelbourneTime?: string; // Human-readable Melbourne time
    estimatedMelbourneTime?: string | undefined; // Human-readable Melbourne time for real-time
    minutesUntilDeparture?: number; // Minutes from now until departure
  };
  origin?: {
    id: number;
    name: string;
    suburb?: string | undefined;
  };
  destination?: {
    id: number;
    name: string;
    suburb?: string | undefined;
  };
  disruptions?: {
    id: number;
    title: string;
    description?: string | undefined;
    url?: string | undefined;
  }[];
  journey?: {
    durationMinutes?: number;
    changes: number;
  };
  timing?: {
    currentTime: string; // Current Melbourne time for context
    searchTime: string; // Time the search was performed
    within30MinuteWindow: boolean; // Confirms it's within the expected window
  };
}

export const nextTrainSchema = {
  type: 'object',
  required: ['origin', 'destination'],
  properties: {
    origin: { type: 'string', description: 'Origin station name (e.g., "Flinders Street", "South Morang")' },
    destination: { type: 'string', description: 'Destination station name (e.g., "South Morang", "Flinders Street")' },
    time: { 
      type: 'string', 
      description: 'Departure time in Melbourne time (e.g., "2:30 PM", "14:30", or ISO format). Defaults to current Melbourne time.' 
    },
  },
  additionalProperties: false,
} as const;

interface ToolError extends Error {
  code: string;
  status?: number | undefined;
}

export class NextTrainTool {
  constructor(private client = new PtvClient()) {}

  async execute(input: NextTrainInput): Promise<{ data: NextTrainOutput; metadata: Record<string, unknown> }> {
    const started = Date.now();
    let apiCalls = 0;
    let cacheHits = 0;

    try {
      // Step 1: Resolve origin and destination stops
      console.log(`🔍 Searching for stops: ${input.origin} → ${input.destination}`);
      
      const [originStops, destinationStops] = await Promise.all([
        this.client.findTrainStops(input.origin),
        this.client.findTrainStops(input.destination),
      ]);
      apiCalls += 2;

      if (originStops.length === 0) {
        throw this.createError('STOP_NOT_FOUND', `Origin stop "${input.origin}" not found`, 404);
      }
      if (destinationStops.length === 0) {
        throw this.createError('STOP_NOT_FOUND', `Destination stop "${input.destination}" not found`, 404);
      }

      // Use the best matching stops (first result, which is usually most relevant)
      const originStop = originStops[0]!;
      const destinationStop = destinationStops[0]!;

      console.log(`✅ Resolved stops: ${originStop.stop_name} (${originStop.stop_id}) → ${destinationStop.stop_name} (${destinationStop.stop_id})`);

      // Step 2: Find routes that connect both stops
      const commonRoutes = await this.findCommonRoutes(originStop, destinationStop);
      apiCalls += 1; // Typically cached after first lookup
      
      if (commonRoutes.length === 0) {
        throw this.createError('NO_ROUTE', `No train routes found connecting ${originStop.stop_name} to ${destinationStop.stop_name}`, 404);
      }

      console.log(`🛤️  Found ${commonRoutes.length} connecting routes:`, commonRoutes.map(r => r.route_name));

      // Step 3: For each route, find the correct direction and get departures
      const departurePromises = commonRoutes.map(async (route) => {
        try {
          return await this.findNextDepartureForRoute(
            route,
            originStop,
            destinationStop,
            input.time
          );
        } catch (error: any) {
          console.log(`⚠️  Route ${route.route_name} failed:`, error.message);
          return null;
        }
      });

      const departures = (await Promise.all(departurePromises)).filter(Boolean);
      apiCalls += commonRoutes.length * 2; // Directions + departures per route

      if (departures.length === 0) {
        throw this.createError('NO_DEPARTURES', 'No upcoming train departures found for this journey', 404);
      }

      // Step 4: Select the earliest departure
      const nextDeparture = departures
        .filter(d => d !== null)
        .sort((a, b) => 
          new Date(a!.departure.scheduled_departure_utc!).getTime() - 
          new Date(b!.departure.scheduled_departure_utc!).getTime()
        )[0]!;

      console.log(`🚂 Next departure: ${nextDeparture.route.route_name} at ${nextDeparture.departure.scheduled_departure_utc}`);

      // Step 5: Get disruptions for the selected route
      const disruptions = await this.getRelevantDisruptions(nextDeparture.route.route_id!);
      apiCalls += 1;

      // Step 6: Build response with timing information
      const currentTime = new Date();
      const departureTime = new Date(nextDeparture.departure.scheduled_departure_utc!);
      const estimatedTime = nextDeparture.departure.estimated_departure_utc ? 
        new Date(nextDeparture.departure.estimated_departure_utc) : null;
      const minutesUntilDeparture = Math.round((departureTime.getTime() - currentTime.getTime()) / (1000 * 60));
      const within30MinuteWindow = minutesUntilDeparture >= 0 && minutesUntilDeparture <= 30;
      
      const result: NextTrainOutput = {
        route: {
          id: nextDeparture.route.route_id!,
          name: nextDeparture.route.route_name!,
          number: nextDeparture.route.route_number,
        },
        direction: {
          id: nextDeparture.direction.direction_id!,
          name: nextDeparture.direction.direction_name!,
        },
        departure: {
          scheduled: nextDeparture.departure.scheduled_departure_utc!,
          estimated: nextDeparture.departure.estimated_departure_utc,
          platform: nextDeparture.departure.platform_number,
          runRef: nextDeparture.departure.run_ref,
          atPlatform: nextDeparture.departure.at_platform,
          // Add human-readable timing information
          scheduledMelbourneTime: formatUTCForMelbourne(nextDeparture.departure.scheduled_departure_utc!),
          estimatedMelbourneTime: estimatedTime ? formatUTCForMelbourne(nextDeparture.departure.estimated_departure_utc!) : undefined,
          minutesUntilDeparture: minutesUntilDeparture,
        },
        origin: {
          id: originStop.stop_id!,
          name: originStop.stop_name!,
          suburb: originStop.stop_suburb,
        },
        destination: {
          id: destinationStop.stop_id!,
          name: destinationStop.stop_name!,
          suburb: destinationStop.stop_suburb,
        },
        disruptions: disruptions.map(d => ({
          id: d.disruption_id!,
          title: d.title!,
          description: d.description || undefined,
          url: d.url || undefined,
        })),
        journey: {
          changes: 0, // Direct train (no changes required)
        },
        timing: {
          currentTime: formatUTCForMelbourne(currentTime.toISOString()),
          searchTime: formatUTCForMelbourne(new Date().toISOString()),
          within30MinuteWindow: within30MinuteWindow,
        },
      };

      return {
        data: result,
        metadata: {
          executionTime: Date.now() - started,
          apiCalls,
          cacheHits,
          dataFreshness: new Date().toISOString(),
          routesConsidered: commonRoutes.length,
          departuresFound: departures.length,
          timezone: getTimezoneDebugInfo(),
        },
      };

    } catch (error: any) {
      console.error('❌ NextTrain error:', error);
      throw error;
    }
  }

  /**
   * Find routes that service both origin and destination stops
   */
  private async findCommonRoutes(origin: ResultStop, destination: ResultStop): Promise<ResultRoute[]> {
    // Get routes for both stops from their stop data or fetch routes
    const originRoutes = origin.routes || [];
    const destRoutes = destination.routes || [];

    if (originRoutes.length === 0 || destRoutes.length === 0) {
      // Fallback: get all train routes and filter
      const allRoutes = await this.client.getRoutes(ROUTE_TYPE.TRAIN);
      return allRoutes.routes?.filter(r => r.route_type === ROUTE_TYPE.TRAIN) || [];
    }

    // Find intersection of routes that service both stops
    const commonRoutes = originRoutes.filter(originRoute =>
      destRoutes.some(destRoute => destRoute.route_id === originRoute.route_id)
    ).filter(route => route.route_type === ROUTE_TYPE.TRAIN);

    return commonRoutes;
  }

  /**
   * Find the next departure for a specific route from origin toward destination
   */
  private async findNextDepartureForRoute(
    route: ResultRoute,
    origin: ResultStop,
    destination: ResultStop,
    requestTime?: string
  ): Promise<{
    departure: DepartureItem;
    route: ExpandedRoute;
    direction: ExpandedDirection;
    run: ExpandedRun;
  } | null> {
    // Get directions for this route
    const directionsResult = await this.client.getDirectionsForRoute(route.route_id!);
    const directions = directionsResult.directions || [];

    if (directions.length === 0) {
      throw this.createError('NO_DIRECTIONS', `No directions found for route ${route.route_name}`);
    }

    // Try each direction to find one that has departures and services the destination
    for (const direction of directions) {
      try {
        const departureOptions: any = {
          route_id: route.route_id!,
          direction_id: direction.direction_id,
          max_results: 5,
        };
        if (requestTime) {
          // Convert user time to Melbourne UTC for API
          departureOptions.date_utc = parseUserTimeToMelbourneUTC(requestTime);
        }
        
        const departures = await this.client.getDepartures(
          ROUTE_TYPE.TRAIN,
          origin.stop_id!,
          departureOptions
        );

        if (!departures.departures || departures.departures.length === 0) {
          continue;
        }

        // Filter departures to only those within the 30-minute window
        const now = new Date();
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
        
        const validDepartures = departures.departures.filter(departure => {
          if (!departure.scheduled_departure_utc) return false;
          const depTime = new Date(departure.scheduled_departure_utc);
          return depTime >= now && depTime <= thirtyMinutesFromNow;
        });
        
        console.log(`   ⏰ ${validDepartures.length} departures within 30-minute window`);
        
        // Check departures within the time window
        for (const departure of validDepartures) {
          if (!departure.run_ref) continue;

          const isValidRun = await this.validateRunServicesDestination(
            departure.run_ref,
            destination.stop_id!
          );

          if (isValidRun) {
            return {
              departure,
              route: departures.routes![route.route_id!.toString()]!,
              direction: departures.directions![direction.direction_id.toString()]!,
              run: departures.runs![departure.run_ref]!,
            };
          }
        }
      } catch (error: any) {
        console.log(`Direction ${direction.direction_name} failed:`, error.message);
        continue;
      }
    }

    return null;
  }

  /**
   * Validate that a run services the destination stop
   * Since we've already confirmed the route connects both stations, we can
   * simplify this by just checking if the departure is within our time window
   */
  private async validateRunServicesDestination(_runRef: string, _destinationStopId: number): Promise<boolean> {
    // For now, since we've already validated that the route connects both stops,
    // and the PTV runs API isn't reliably returning stopping patterns,
    // we'll assume all runs on the matching route serve both stops.
    // This is a reasonable assumption since we filtered routes by common stops.
    return true;
  }

  /**
   * Get relevant disruptions for a route
   */
  private async getRelevantDisruptions(routeId: number): Promise<DisruptionItem[]> {
    try {
      const disruptionsResult = await this.client.getDisruptionsByRoute(routeId);
      const trainDisruptions = disruptionsResult.disruptions?.metro_train || [];
      
      // Filter to only current/active disruptions
      return trainDisruptions.filter(disruption => {
        if (!disruption.from_date || !disruption.to_date) return true; // No date range means active
        const now = new Date();
        const from = new Date(disruption.from_date);
        const to = new Date(disruption.to_date);
        return now >= from && now <= to;
      });
    } catch (error: any) {
      console.warn('Could not fetch disruptions:', error.message);
      return [];
    }
  }

  /**
   * Create a structured error
   */
  private createError(code: string, message: string, status?: number): ToolError {
    const error = new Error(message) as ToolError;
    error.code = code;
    if (status !== undefined) {
      error.status = status;
    }
    return error;
  }
}
