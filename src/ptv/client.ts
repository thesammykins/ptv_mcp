import { ptvFetch } from './http';
import { TTLCache } from './cache';
import { config } from '../config';
import type {
  SearchResult,
  DeparturesResponse,
  DirectionsResponse,
  DisruptionsResponse,
  RunResponse,
  RoutesResponse,
  RunsResponse,
  ResultStop,
  ResultRoute,
  Direction,
} from './types';
import { ROUTE_TYPE } from './types';

// Expand parameter constants
const EXPAND = {
  ALL: 0,
  STOP: 1,
  ROUTE: 2,
  RUN: 3,
  DIRECTION: 4,
  DISRUPTION: 5,
  VEHICLE_POSITION: 6,
  VEHICLE_DESCRIPTOR: 7,
} as const;

export class PtvClient {
  private stopsCache: TTLCache<ResultStop[]>;
  private routesCache: TTLCache<ResultRoute[]>;
  private directionsCache: TTLCache<Direction[]>;
  
  constructor() {
    const cacheTtl = config.cacheTtlHours * 60 * 60 * 1000; // Convert hours to ms
    this.stopsCache = new TTLCache<ResultStop[]>(cacheTtl);
    this.routesCache = new TTLCache<ResultRoute[]>(cacheTtl);
    this.directionsCache = new TTLCache<Direction[]>(cacheTtl);
  }

  /**
   * Search for stops, routes, and outlets by term
   * Caches stop results for faster subsequent lookups
   */
  async search(term: string, route_types?: number[]): Promise<SearchResult> {
    const cacheKey = `search:${term}:${route_types?.join(',') || 'all'}`;
    const cached = this.stopsCache.get(cacheKey);
    
    if (cached) {
      return { stops: cached };
    }

    const result = await ptvFetch<SearchResult>('/v3/search/' + encodeURIComponent(term), {
      route_types: route_types?.join(','),
    });

    // Cache the stops for future lookups
    if (result.stops) {
      this.stopsCache.set(cacheKey, result.stops);
    }

    return result;
  }

  /**
   * Find stops by name, filtered to trains only
   */
  async findTrainStops(stopName: string): Promise<ResultStop[]> {
    const result = await this.search(stopName, [ROUTE_TYPE.TRAIN]);
    return result.stops?.filter(stop => stop.route_type === ROUTE_TYPE.TRAIN) || [];
  }

  /**
   * Get all routes or routes for a specific route type
   */
  async getRoutes(route_type?: number): Promise<RoutesResponse> {
    const cacheKey = `routes:${route_type || 'all'}`;
    const cached = this.routesCache.get(cacheKey);
    
    if (cached) {
      return { routes: cached };
    }

    const result = await ptvFetch<RoutesResponse>('/v3/routes', {
      route_type: route_type?.toString(),
    });

    if (result.routes) {
      this.routesCache.set(cacheKey, result.routes);
    }

    return result;
  }

  /**
   * Get directions for a specific route (cached)
   */
  async getDirectionsForRoute(routeId: number): Promise<DirectionsResponse> {
    const cacheKey = `directions:${routeId}`;
    const cached = this.directionsCache.get(cacheKey);
    
    if (cached) {
      return { directions: cached };
    }

    const result = await ptvFetch<DirectionsResponse>(`/v3/directions/route/${routeId}`);

    if (result.directions) {
      this.directionsCache.set(cacheKey, result.directions);
    }

    return result;
  }

  /**
   * Get departures from a stop with full expansion
   */
  async getDepartures(
    routeType: number,
    stopId: number,
    options: {
      route_id?: number;
      direction_id?: number;
      max_results?: number;
      date_utc?: string;
      include_cancelled?: boolean;
      look_backwards?: boolean;
      gtfs?: boolean;
      include_geopath?: boolean;
    } = {}
  ): Promise<DeparturesResponse> {
    const params = {
      ...options,
      // Always expand to get full details
      expand: [EXPAND.RUN, EXPAND.ROUTE, EXPAND.DIRECTION, EXPAND.STOP, EXPAND.DISRUPTION].join(','),
    };

    return ptvFetch<DeparturesResponse>(
      `/v3/departures/route_type/${routeType}/stop/${stopId}`,
      params
    );
  }

  /**
   * Get run pattern (stopping pattern) for a specific run
   * Used to validate if a run services a destination stop
   */
  async getRunPattern(
    runRef: string,
    routeType: number,
    options: {
      expand?: number[];
      stop_id?: number;
      date_utc?: string;
      include_skipped_stops?: boolean;
      include_geopath?: boolean;
    } = {}
  ): Promise<RunResponse> {
    const params = {
      ...options,
      expand: options.expand?.join(',') || [EXPAND.STOP, EXPAND.RUN, EXPAND.ROUTE].join(','),
    };

    return ptvFetch<RunResponse>(
      `/v3/runs/${encodeURIComponent(runRef)}/route_type/${routeType}`,
      params
    );
  }

  /**
   * Get disruptions by route
   */
  async getDisruptionsByRoute(routeId: number): Promise<DisruptionsResponse> {
    return ptvFetch<DisruptionsResponse>(`/v3/disruptions/route/${routeId}`);
  }

  /**
   * Get disruptions by stop
   */
  async getDisruptionsByStop(stopId: number): Promise<DisruptionsResponse> {
    return ptvFetch<DisruptionsResponse>(`/v3/disruptions/stop/${stopId}`);
  }

  /**
   * Get all current disruptions
   */
  async getAllDisruptions(route_types?: number[]): Promise<DisruptionsResponse> {
    return ptvFetch<DisruptionsResponse>('/v3/disruptions', {
      route_types: route_types?.join(','),
    });
  }

  /**
   * Get runs on routes with vehicle position data (if available)
   */
  async getRuns(
    routeId: number,
    routeType: number,
    options: {
      direction_id?: number;
      date_utc?: string;
      include_geopath?: boolean;
    } = {}
  ): Promise<RunsResponse> {
    const params = {
      ...options,
      expand: [EXPAND.ALL].join(','), // Get all expanded data including vehicle positions
    };

    return ptvFetch<RunsResponse>(
      `/v3/runs/route/${routeId}/route_type/${routeType}`,
      params
    );
  }

  /**
   * Clear all caches (useful for testing or manual cache busting)
   */
  clearCaches(): void {
    this.stopsCache.clear();
    this.routesCache.clear();
    this.directionsCache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { stops: number; routes: number; directions: number } {
    // Simple implementation - in production might track hit/miss ratios
    return {
      stops: (this.stopsCache as any).store.size || 0,
      routes: (this.routesCache as any).store.size || 0,
      directions: (this.directionsCache as any).store.size || 0,
    };
  }
}
