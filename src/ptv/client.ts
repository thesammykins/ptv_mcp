import { ptvFetch } from '@/ptv/http';
import type {
  SearchResult,
  DeparturesResponse,
  Direction,
  DisruptionsResponse,
} from '@/ptv/types';

export class PtvClient {
  async search(term: string, route_types?: number[]): Promise<SearchResult> {
    return ptvFetch('/v3/search/' + encodeURIComponent(term), {
      route_types: route_types?.join(','),
    });
  }

  async routes(): Promise<any> {
    return ptvFetch('/v3/routes');
  }

  async directionsForRoute(routeId: number): Promise<{ directions: Direction[] }> {
    return ptvFetch(`/v3/directions/route/${routeId}`);
  }

  async departures(
    routeType: number,
    stopId: number,
    opts: { route_id?: number; direction_id?: number; max_results?: number; expand?: number[]; date_utc?: string } = {}
  ): Promise<DeparturesResponse> {
    const params = {
      ...opts,
      expand: opts.expand?.join(','),
    };
    return ptvFetch(`/v3/departures/route_type/${routeType}/stop/${stopId}`, params);
    }

  async runPattern(runRef: string, routeType: number, opts: { include_skipped_stops?: boolean } = {}): Promise<any> {
    return ptvFetch(`/v3/runs/${encodeURIComponent(runRef)}/route_type/${routeType}`, opts);
  }

  async disruptionsByRoute(routeId: number): Promise<DisruptionsResponse> {
    return ptvFetch(`/v3/disruptions/route/${routeId}`);
  }
}
