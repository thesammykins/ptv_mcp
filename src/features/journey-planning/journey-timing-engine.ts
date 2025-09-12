/*
  Journey Timing Engine v1
  
  Orchestrates connection-aware journey planning by:
  1. Finding first-leg runs with their actual stopping patterns
  2. Calculating realistic arrival times at interchange stations
  3. Applying connection policies to determine feasible second-leg departures
  4. Returning complete journeys with timing validation

  This solves the core problem of impossible connections like Bendigo → Southern Cross → South Morang
  where the current system proposes 8-minute transfers after 2+ hour regional journeys.
*/

import { PtvClient } from '../../ptv/client';
import { connectionPolicy } from './connection-policy';
import { parseUserTimeToMelbourneUTC, formatUTCForMelbourne } from '../../utils/melbourne-time';
import { TTLCache } from '../../ptv/cache';
import {
  ROUTE_TYPE,
  JourneyLeg,
  ConnectionInfo,
  ConnectionValidityStatus,
  JourneyErrorCode,
  PatternDeparture,
  DepartureItem,
  RunResponse,
  ResultStop
} from '../../ptv/types';

export interface JourneyPlanningRequest {
  origin_stop_id: number;
  destination_stop_id: number;
  earliest_departure_utc?: string; // ISO 8601, defaults to now
  preferred_interchanges?: number[]; // Stop IDs
  max_results?: number; // Default 3
  search_window_minutes?: number; // Default 180
}

export interface JourneyOption {
  legs: JourneyLeg[];
  connections: ConnectionInfo[];
  total_journey_minutes: number;
  arrival_utc: string;
  warnings: string[];
  score: number; // Lower is better (earliest arrival preferred)
}

export interface JourneyPlanningResult {
  journeys: JourneyOption[];
  error_code?: JourneyErrorCode;
  error_message?: string;
  metadata: {
    api_calls: number;
    cache_hits: number;
    execution_time_ms: number;
    routes_considered: number;
    connections_evaluated: number;
  };
}

export class JourneyTimingEngine {
  private ptvClient: PtvClient;
  private patternCache: TTLCache<RunResponse>; // Cache stopping patterns for 5 minutes

  constructor(ptvClient?: PtvClient) {
    this.ptvClient = ptvClient || new PtvClient();
    this.patternCache = new TTLCache<RunResponse>(5 * 60 * 1000); // 5 minute TTL
  }

  /**
   * Plan a two-leg journey with connection validation
   */
  async planTwoLegJourney(request: JourneyPlanningRequest): Promise<JourneyPlanningResult> {
    const startTime = Date.now();
    let apiCalls = 0;
    let cacheHits = 0;
    let routesConsidered = 0;
    let connectionsEvaluated = 0;

    try {
      const earliestDeparture = request.earliest_departure_utc || new Date().toISOString();
      const searchWindowEnd = new Date(Date.parse(earliestDeparture) + (request.search_window_minutes || 180) * 60 * 1000);

      console.log(`🚄 Planning journey: ${request.origin_stop_id} → ${request.destination_stop_id}`);
      console.log(`   Search window: ${formatUTCForMelbourne(earliestDeparture)} → ${formatUTCForMelbourne(searchWindowEnd.toISOString())}`);

      // Step A: Get candidate first-leg runs
      const firstLegOptions = await this.getCandidateFirstLegRuns(
        request.origin_stop_id,
        earliestDeparture,
        searchWindowEnd.toISOString(),
        request.preferred_interchanges
      );
      apiCalls += 1; // Departures call
      routesConsidered += firstLegOptions.length;

      if (firstLegOptions.length === 0) {
        return {
          journeys: [],
          error_code: JourneyErrorCode.NO_FEASIBLE_CONNECTIONS,
          error_message: 'No departures found from origin within search window',
          metadata: { api_calls: apiCalls, cache_hits: cacheHits, execution_time_ms: Date.now() - startTime, routes_considered: routesConsidered, connections_evaluated: connectionsEvaluated }
        };
      }

      console.log(`   Found ${firstLegOptions.length} first-leg candidates`);

      // Step B & C: For each first leg, get stopping pattern and find connections
      const journeyOptions: JourneyOption[] = [];

      for (const firstLeg of firstLegOptions.slice(0, request.max_results || 3)) {
        try {
          const stoppingPattern = await this.getRunStoppingPattern(firstLeg.run_ref!, firstLeg.route_type!);
          if (this.patternCache.has(firstLeg.run_ref!)) {
            cacheHits += 1;
          } else {
            apiCalls += 1;
          }

          // Find interchange arrival time in the stopping pattern
          const interchangeArrival = this.findInterchangeArrival(stoppingPattern, firstLeg.interchange_stop_id);
          if (!interchangeArrival) {
            console.log(`   ⚠️  No interchange stop found in stopping pattern for run ${firstLeg.run_ref}`);
            continue;
          }

          // Step D: Calculate earliest connection time
          const minConnectionTime = connectionPolicy.getMinConnectionTime(
            firstLeg.interchange_stop_id,
            firstLeg.route_type!,
            ROUTE_TYPE.TRAIN, // Assuming second leg is metro
            interchangeArrival.platform_number || undefined,
            undefined
          );

          const arrivalTime = new Date(interchangeArrival.scheduled_departure_utc!);
          const earliestConnectionTime = new Date(arrivalTime.getTime() + minConnectionTime * 60 * 1000);

          console.log(`   📍 ${firstLeg.interchange_name}: arrive ${formatUTCForMelbourne(arrivalTime.toISOString())}, connection after ${formatUTCForMelbourne(earliestConnectionTime.toISOString())} (+${minConnectionTime}min)`);

          // Step E: Find feasible second-leg runs
          const secondLegOptions = await this.findSecondLegConnections(
            firstLeg.interchange_stop_id,
            request.destination_stop_id,
            earliestConnectionTime.toISOString(),
            searchWindowEnd.toISOString()
          );
          apiCalls += 1; // Departures call for second leg
          connectionsEvaluated += secondLegOptions.length;

          // Step F: Create complete journey options
          for (const secondLeg of secondLegOptions.slice(0, 2)) { // Max 2 second legs per first leg
            const journey = await this.buildCompleteJourney(
              firstLeg,
              secondLeg,
              interchangeArrival,
              minConnectionTime
            );
            if (journey) {
              journeyOptions.push(journey);
            }
          }

        } catch (error) {
          console.log(`   ❌ Error processing first leg ${firstLeg.run_ref}:`, error);
          continue;
        }
      }

      // Step G: Score and sort journey options
      if (journeyOptions.length === 0) {
        return {
          journeys: [],
          error_code: JourneyErrorCode.NO_FEASIBLE_CONNECTIONS,
          error_message: 'No feasible connections found within search window and connection time constraints',
          metadata: { api_calls: apiCalls, cache_hits: cacheHits, execution_time_ms: Date.now() - startTime, routes_considered: routesConsidered, connections_evaluated: connectionsEvaluated }
        };
      }

      journeyOptions.sort((a, b) => a.score - b.score); // Lower score = better (earlier arrival)

      console.log(`   ✅ Found ${journeyOptions.length} feasible journey options`);

      return {
        journeys: journeyOptions.slice(0, request.max_results || 3),
        metadata: { api_calls: apiCalls, cache_hits: cacheHits, execution_time_ms: Date.now() - startTime, routes_considered: routesConsidered, connections_evaluated: connectionsEvaluated }
      };

    } catch (error: any) {
      console.error('❌ Journey planning error:', error);
      return {
        journeys: [],
        error_code: JourneyErrorCode.API_TIMEOUT,
        error_message: `Journey planning failed: ${error.message}`,
        metadata: { api_calls: apiCalls, cache_hits: cacheHits, execution_time_ms: Date.now() - startTime, routes_considered: routesConsidered, connections_evaluated: connectionsEvaluated }
      };
    }
  }

  /**
   * Get candidate first-leg runs that serve potential interchange stations
   */
  private async getCandidateFirstLegRuns(
    originStopId: number,
    earliestDeparture: string,
    searchWindowEnd: string,
    preferredInterchanges?: number[]
  ): Promise<Array<DepartureItem & { interchange_stop_id: number; interchange_name: string; route_type: number }>> {
    // Get departures from origin
    const departures = await this.ptvClient.getDepartures(
      ROUTE_TYPE.TRAIN, // Start with metro
      originStopId,
      {
        date_utc: earliestDeparture,
        max_results: 20,
        expand: ['run', 'route', 'stop']
      }
    );

    // Also try V/Line if no metro results
    if (!departures.departures || departures.departures.length === 0) {
      const vlineDepartures = await this.ptvClient.getDepartures(
        ROUTE_TYPE.VLINE,
        originStopId,
        {
          date_utc: earliestDeparture,
          max_results: 20,
          expand: ['run', 'route', 'stop']
        }
      );
      if (vlineDepartures.departures) {
        departures.departures = vlineDepartures.departures;
        departures.routes = vlineDepartures.routes;
      }
    }

    if (!departures.departures || departures.departures.length === 0) {
      return [];
    }

    // Filter to search window and determine interchange stations
    const candidates: Array<DepartureItem & { interchange_stop_id: number; interchange_name: string; route_type: number }> = [];
    const searchWindowEndTime = new Date(searchWindowEnd);

    for (const departure of departures.departures) {
      if (!departure.scheduled_departure_utc || !departure.run_ref) continue;

      const depTime = new Date(departure.scheduled_departure_utc);
      if (depTime > searchWindowEndTime) continue;

      // Determine appropriate interchange for this route type
      const routeType = departure.route_id && departures.routes?.[departure.route_id.toString()]?.route_type || ROUTE_TYPE.TRAIN;
      let interchangeStopId: number;
      let interchangeName: string;

      if (preferredInterchanges && preferredInterchanges.length > 0) {
        interchangeStopId = preferredInterchanges[0];
        interchangeName = 'Preferred Interchange';
      } else if (routeType === ROUTE_TYPE.VLINE) {
        interchangeStopId = connectionPolicy.getSouthernCrossStationId();
        interchangeName = 'Southern Cross Station';
      } else {
        interchangeStopId = connectionPolicy.getFlindersStreetStationId();
        interchangeName = 'Flinders Street Station';
      }

      candidates.push({
        ...departure,
        interchange_stop_id: interchangeStopId,
        interchange_name: interchangeName,
        route_type: routeType
      });
    }

    return candidates;
  }

  /**
   * Get stopping pattern for a run (with caching)
   */
  private async getRunStoppingPattern(runRef: string, routeType: number): Promise<RunResponse> {
    const cacheKey = `${runRef}_${routeType}`;
    const cached = this.patternCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const pattern = await this.ptvClient.getRun(runRef, routeType, {
      expand: ['stop', 'run', 'route']
    });
    
    this.patternCache.set(cacheKey, pattern);
    return pattern;
  }

  /**
   * Find the interchange stop in the run's stopping pattern
   */
  private findInterchangeArrival(stoppingPattern: RunResponse, interchangeStopId: number): PatternDeparture | null {
    if (!stoppingPattern.departures) return null;

    for (const departure of stoppingPattern.departures) {
      if (departure.stop_id === interchangeStopId) {
        return departure;
      }
    }
    return null;
  }

  /**
   * Find the destination stop in the run's stopping pattern
   */
  private findDestinationArrival(stoppingPattern: RunResponse, destinationStopId: number): PatternDeparture | null {
    if (!stoppingPattern.departures) return null;

    for (const departure of stoppingPattern.departures) {
      if (departure.stop_id === destinationStopId) {
        return departure;
      }
    }
    return null;
  }

  /**
   * Find second-leg connections from interchange to destination
   */
  private async findSecondLegConnections(
    interchangeStopId: number,
    destinationStopId: number,
    earliestConnectionTime: string,
    searchWindowEnd: string
  ): Promise<Array<DepartureItem & { destination_arrival_time: string }>> {
    const departures = await this.ptvClient.getDepartures(
      ROUTE_TYPE.TRAIN,
      interchangeStopId,
      {
        date_utc: earliestConnectionTime,
        max_results: 15,
        expand: ['run', 'route', 'stop']
      }
    );

    if (!departures.departures) return [];

    const searchEndTime = new Date(searchWindowEnd);
    const connections: Array<DepartureItem & { destination_arrival_time: string }> = [];

    for (const departure of departures.departures) {
      if (!departure.scheduled_departure_utc || !departure.run_ref) continue;

      const depTime = new Date(departure.scheduled_departure_utc);
      if (depTime > searchEndTime) continue;

      try {
        // Get stopping pattern to validate destination and get arrival time
        const stoppingPattern = await this.getRunStoppingPattern(departure.run_ref!, ROUTE_TYPE.TRAIN);
        const destinationArrival = this.findDestinationArrival(stoppingPattern, destinationStopId);
        
        if (destinationArrival) {
          connections.push({
            ...departure,
            destination_arrival_time: destinationArrival.scheduled_departure_utc!
          });
        } else {
          console.log(`   ⚠️  Run ${departure.run_ref} does not serve destination stop ${destinationStopId}`);
        }
      } catch (error) {
        console.log(`   ❌ Error checking run ${departure.run_ref}:`, error);
        continue;
      }
    }

    return connections;
  }

  /**
   * Build complete journey from first leg + second leg + connection info
   */
  private async buildCompleteJourney(
    firstLeg: DepartureItem & { interchange_stop_id: number; interchange_name: string; route_type: number },
    secondLeg: DepartureItem & { destination_arrival_time: string },
    interchangeArrival: PatternDeparture,
    minConnectionTime: number
  ): Promise<JourneyOption | null> {
    try {
      // Calculate timing
      const firstLegDeparture = new Date(firstLeg.scheduled_departure_utc!);
      const interchangeArrivalTime = new Date(interchangeArrival.scheduled_departure_utc!);
      const secondLegDeparture = new Date(secondLeg.scheduled_departure_utc!);
      
      // Use actual destination arrival time from stopping pattern
      const destinationArrival = new Date(secondLeg.destination_arrival_time);
      
      const totalJourneyMinutes = Math.round((destinationArrival.getTime() - firstLegDeparture.getTime()) / (60 * 1000));
      const actualWaitMinutes = Math.round((secondLegDeparture.getTime() - interchangeArrivalTime.getTime()) / (60 * 1000));
      const secondLegDurationMinutes = Math.round((destinationArrival.getTime() - secondLegDeparture.getTime()) / (60 * 1000));

      // Validate connection
      const connectionValidation = connectionPolicy.validateConnection(actualWaitMinutes, minConnectionTime);
      
      // Build legs
      const legs: JourneyLeg[] = [
        {
          origin_stop_id: firstLeg.stop_id!,
          origin_stop_name: 'Origin Station', // TODO: Get from expanded stops
          destination_stop_id: firstLeg.interchange_stop_id,
          destination_stop_name: firstLeg.interchange_name,
          route_id: firstLeg.route_id!,
          route_name: 'First Leg Route', // TODO: Get from expanded routes
          route_type: firstLeg.route_type,
          run_ref: firstLeg.run_ref!,
          departure_utc: firstLeg.scheduled_departure_utc!,
          arrival_utc: interchangeArrival.scheduled_departure_utc!,
          departure_local: formatUTCForMelbourne(firstLeg.scheduled_departure_utc!),
          arrival_local: formatUTCForMelbourne(interchangeArrival.scheduled_departure_utc!),
          platform_number: firstLeg.platform_number || undefined,
          realtime_used: !!firstLeg.estimated_departure_utc,
          cancellation: false,
          duration_minutes: Math.round((interchangeArrivalTime.getTime() - firstLegDeparture.getTime()) / (60 * 1000))
        },
        {
          origin_stop_id: firstLeg.interchange_stop_id,
          origin_stop_name: firstLeg.interchange_name,
          destination_stop_id: secondLeg.stop_id!, // TODO: This should be actual destination
          destination_stop_name: 'Destination Station',
          route_id: secondLeg.route_id!,
          route_name: 'Second Leg Route',
          route_type: ROUTE_TYPE.TRAIN,
          run_ref: secondLeg.run_ref!,
          departure_utc: secondLeg.scheduled_departure_utc!,
          arrival_utc: destinationArrival.toISOString(),
          departure_local: formatUTCForMelbourne(secondLeg.scheduled_departure_utc!),
          arrival_local: formatUTCForMelbourne(destinationArrival.toISOString()),
          platform_number: secondLeg.platform_number || undefined,
          realtime_used: !!secondLeg.estimated_departure_utc,
          cancellation: false,
          duration_minutes: secondLegDurationMinutes
        }
      ];

      // Build connection info
      const connections: ConnectionInfo[] = [
        {
          at_stop_id: firstLeg.interchange_stop_id,
          at_stop_name: firstLeg.interchange_name,
          min_required_minutes: minConnectionTime,
          actual_wait_minutes: actualWaitMinutes,
          from_platform: interchangeArrival.platform_number || undefined,
          to_platform: secondLeg.platform_number || undefined,
          validity_status: connectionValidation.status,
          warning_message: connectionValidation.warning
        }
      ];

      // Build warnings
      const warnings: string[] = [];
      if (connectionValidation.warning) {
        warnings.push(connectionValidation.warning);
      }

      // Calculate score (lower = better)
      const score = destinationArrival.getTime() + 
                   (connectionValidation.status === ConnectionValidityStatus.TIGHT ? 300000 : 0); // Penalty for tight connections

      return {
        legs,
        connections,
        total_journey_minutes: totalJourneyMinutes,
        arrival_utc: destinationArrival.toISOString(),
        warnings,
        score
      };

    } catch (error) {
      console.error('Error building journey:', error);
      return null;
    }
  }
}