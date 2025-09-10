// Minimal TS interfaces for PTV endpoints we use

export interface StatusMeta {
  version?: string;
  health?: 0 | 1;
}

export interface ApiResponseBase {
  status?: StatusMeta;
}

export interface ResultRoute {
  route_id?: number;
  route_name?: string;
  route_number?: string;
  route_type?: number; // 0=train
  route_gtfs_id?: string;
}

export interface ResultStop {
  stop_id?: number;
  stop_name?: string;
  stop_suburb?: string;
  stop_latitude?: number;
  stop_longitude?: number;
  route_type?: number;
  routes?: ResultRoute[];
}

export interface SearchResult extends ApiResponseBase {
  stops?: ResultStop[];
  routes?: ResultRoute[];
}

export interface Direction {
  direction_id: number;
  direction_name: string;
  route_id: number;
  route_type: number;
}

export interface DepartureItem {
  run_id?: number; // deprecated but present
  run_ref?: string;
  route_id?: number;
  direction_id?: number;
  stop_id?: number;
  scheduled_departure_utc?: string;
  estimated_departure_utc?: string | null;
  at_platform?: boolean;
  platform_number?: string | null;
  disruption_ids?: number[];
}

export interface DeparturesResponse extends ApiResponseBase {
  departures: DepartureItem[];
  // expanded objects omitted
}

export interface DisruptionsResponse extends ApiResponseBase {
  disruptions: Record<string, unknown>;
}
