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
   * Find stops by name, returning both metro and V/Line options
   * Prioritizes exact name matches, then metro trains, then V/Line
   */
  async findTrainStops(stopName: string): Promise<ResultStop[]> {
    // Search metropolitan trains first (route_type 0)
    const metroResult = await this.search(stopName, [ROUTE_TYPE.TRAIN]);
    const metroStops = metroResult.stops?.filter(stop => 
      stop.route_type === ROUTE_TYPE.TRAIN
    ) || [];
    
    // Then search V/Line trains (route_type 3) as additional options
    const vlineResult = await this.search(stopName, [ROUTE_TYPE.VLINE]);
    const vlineStops = vlineResult.stops?.filter(stop => 
      stop.route_type === ROUTE_TYPE.VLINE
    ) || [];
    
    // Combine and sort results with smart prioritization
    const allStops = [...metroStops, ...vlineStops.filter(vlineStop => 
      !metroStops.some(metroStop => metroStop.stop_id === vlineStop.stop_id)
    )];
    
    // Sort stops by relevance: exact matches first, then partial matches
    return this.sortStopsByRelevance(allStops, stopName);
  }

  /**
   * Sort stops by relevance to search term, prioritizing exact matches and train connectivity
   */
  private sortStopsByRelevance(stops: ResultStop[], searchTerm: string): ResultStop[] {
    const searchLower = searchTerm.toLowerCase();
    
    return stops.sort((a, b) => {
      const aName = (a.stop_name || '').toLowerCase();
      const bName = (b.stop_name || '').toLowerCase();
      
      // Exact matches get highest priority
      const aExactMatch = aName === searchLower;
      const bExactMatch = bName === searchLower;
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      // Then station name exact matches (e.g., "South Morang Station" for "South Morang")
      const aStationMatch = aName === `${searchLower} station`;
      const bStationMatch = bName === `${searchLower} station`;
      if (aStationMatch && !bStationMatch) return -1;
      if (!aStationMatch && bStationMatch) return 1;
      
      // Prioritize stops with train routes to Melbourne (indicates proper train stations)
      const aMelbourneRoutes = this.countMelbourneRoutes(a);
      const bMelbourneRoutes = this.countMelbourneRoutes(b);
      if (aMelbourneRoutes > bMelbourneRoutes) return -1;
      if (aMelbourneRoutes < bMelbourneRoutes) return 1;
      
      // Prefer "Railway Station" in name (indicates main train station)
      const aIsRailwayStation = aName.includes('railway station');
      const bIsRailwayStation = bName.includes('railway station');
      if (aIsRailwayStation && !bIsRailwayStation) return -1;
      if (!aIsRailwayStation && bIsRailwayStation) return 1;
      
      // Then prefer metro over V/Line for same relevance
      if (a.route_type === ROUTE_TYPE.TRAIN && b.route_type === ROUTE_TYPE.VLINE) return -1;
      if (a.route_type === ROUTE_TYPE.VLINE && b.route_type === ROUTE_TYPE.TRAIN) return 1;
      
      // Finally, prioritize starts-with matches
      const aStartsWith = aName.startsWith(searchLower);
      const bStartsWith = bName.startsWith(searchLower);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      return 0; // Keep original order for equal relevance
    });
  }
  
  /**
   * Count routes that connect to Melbourne (indicates proper train stations vs bus stops)
   */
  private countMelbourneRoutes(stop: ResultStop): number {
    if (!stop.routes) return 0;
    
    return stop.routes.filter(route => {
      const routeName = (route.route_name || '').toLowerCase();
      return routeName.includes('melbourne') || 
             routeName.includes('gisborne') ||  // Bendigo-Melbourne via Gisborne
             routeName.includes('southern cross') ||
             routeName.includes('flinders street');
    }).length;
  }

  /**
   * Find the best matching stops for a journey, considering route type compatibility
   * Returns the optimal origin/destination pair based on available connections
   */
  async findCompatibleStopPair(originName: string, destinationName: string): Promise<{ origin: ResultStop; destination: ResultStop } | null> {
    const [originStops, destinationStops] = await Promise.all([
      this.findTrainStops(originName),
      this.findTrainStops(destinationName),
    ]);

    if (originStops.length === 0 || destinationStops.length === 0) {
      return null;
    }

    // Strategy 1: Try to find metro-to-metro connections first (most common journeys)
    const metroOrigins = originStops.filter(s => s.route_type === ROUTE_TYPE.TRAIN);
    const metroDestinations = destinationStops.filter(s => s.route_type === ROUTE_TYPE.TRAIN);
    if (metroOrigins.length > 0 && metroDestinations.length > 0) {
      return { origin: metroOrigins[0]!, destination: metroDestinations[0]! };
    }

    // Strategy 2: V/Line to Metro interchange (e.g., Bendigo → Flinders Street)
    // Use V/Line origin with Metro destination for proper interchange
    const vlineOrigins = originStops.filter(s => s.route_type === ROUTE_TYPE.VLINE);
    if (vlineOrigins.length > 0 && metroDestinations.length > 0) {
      // Check if destination is a major interchange station
      const majorInterchanges = ['flinders street', 'southern cross', 'melbourne'];
      const destName = destinationName.toLowerCase();
      const isMajorInterchange = majorInterchanges.some(station => destName.includes(station));
      
      if (isMajorInterchange) {
        return { origin: vlineOrigins[0]!, destination: metroDestinations[0]! };
      }
    }

    // Strategy 3: Metro to V/Line interchange (e.g., Flinders Street → Bendigo)
    if (metroOrigins.length > 0 && vlineOrigins.length > 0) {
      const originName = originStops[0]?.stop_name?.toLowerCase() || '';
      const majorInterchanges = ['flinders street', 'southern cross', 'melbourne'];
      const isMajorInterchange = majorInterchanges.some(station => originName.includes(station));
      
      if (isMajorInterchange) {
        return { origin: metroOrigins[0]!, destination: vlineOrigins[0]! };
      }
    }

    // Strategy 4: Try V/Line-to-V/Line connections (regional journeys)
    const vlineDestinations = destinationStops.filter(s => s.route_type === ROUTE_TYPE.VLINE);
    if (vlineOrigins.length > 0 && vlineDestinations.length > 0) {
      return { origin: vlineOrigins[0]!, destination: vlineDestinations[0]! };
    }

    // Strategy 5: Fallback - use the best available stops
    return { origin: originStops[0]!, destination: destinationStops[0]! };
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
   * Get all train routes (both metro and V/Line) merged together
   */
  async getAllTrainRoutes(): Promise<RoutesResponse> {
    const cacheKey = 'routes:all-trains';
    const cached = this.routesCache.get(cacheKey);
    
    if (cached) {
      return { routes: cached };
    }

    // Fetch both metro and V/Line routes in parallel
    const [metroRoutes, vlineRoutes] = await Promise.all([
      this.getRoutes(ROUTE_TYPE.TRAIN),
      this.getRoutes(ROUTE_TYPE.VLINE),
    ]);

    // Merge routes, ensuring route_type is preserved and deduplicating by route_id
    const allRoutes = [
      ...(metroRoutes.routes || []),
      ...(vlineRoutes.routes || []),
    ];

    // Deduplicate by route_id (though unlikely to have duplicates across route types)
    const uniqueRoutes = allRoutes.filter((route, index, arr) => 
      arr.findIndex(r => r.route_id === route.route_id) === index
    );

    // Cache the merged results
    this.routesCache.set(cacheKey, uniqueRoutes);

    return { routes: uniqueRoutes };
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
      // Use ALL expansion to ensure we get complete route, direction, and run data
      expand: EXPAND.ALL.toString(),
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
