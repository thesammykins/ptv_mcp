// TypeScript interfaces for PTV API responses

// Route types (from PTV API)
export const ROUTE_TYPE = {
  TRAIN: 0,
  TRAM: 1,
  BUS: 2,
  VLINE: 3,
  NIGHT_BUS: 4,
} as const;

export interface StatusMeta {
  version?: string;
  health?: 0 | 1;
}

export interface ApiResponseBase {
  status?: StatusMeta;
}

// Search and Routes
export interface ResultRoute {
  route_id?: number;
  route_name?: string;
  route_number?: string;
  route_type?: number; // 0=train, 1=tram, 2=bus, etc.
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
  stop_distance?: number; // distance in meters from search location
}

export interface SearchResult extends ApiResponseBase {
  stops?: ResultStop[];
  routes?: ResultRoute[];
  outlets?: unknown[]; // myki outlets (not used)
}

export interface RoutesResponse extends ApiResponseBase {
  routes?: ResultRoute[];
}

// Directions
export interface Direction {
  direction_id: number;
  direction_name: string;
  route_direction_description?: string;
  route_id?: number;
  route_type?: number;
}

export interface DirectionsResponse extends ApiResponseBase {
  directions?: Direction[];
}

// Departures and Runs
export interface DepartureItem {
  run_id?: number; // deprecated but still present
  run_ref?: string;
  route_id?: number;
  direction_id?: number;
  stop_id?: number;
  scheduled_departure_utc?: string;
  estimated_departure_utc?: string | null;
  at_platform?: boolean;
  platform_number?: string | null;
  flags?: string;
  departure_sequence?: number;
  disruption_ids?: number[];
}

export interface ExpandedRun {
  run_id?: number;
  run_ref?: string;
  route_id?: number;
  route_type?: number;
  final_stop_id?: number;
  destination_name?: string;
  status?: string;
  direction_id?: number;
}

export interface ExpandedRoute {
  route_type?: number;
  route_id?: number;
  route_name?: string;
  route_number?: string;
  route_gtfs_id?: string;
}

export interface ExpandedDirection {
  route_direction_id?: number;
  direction_id?: number;
  direction_name?: string;
  service_time?: string;
}

export interface ExpandedStop {
  stop_id?: number;
  stop_name?: string;
  stop_suburb?: string;
  stop_latitude?: number;
  stop_longitude?: number;
  route_type?: number;
}

export interface DeparturesResponse extends ApiResponseBase {
  departures?: DepartureItem[];
  runs?: Record<string, ExpandedRun>;
  routes?: Record<string, ExpandedRoute>;
  directions?: Record<string, ExpandedDirection>;
  stops?: Record<string, ExpandedStop>;
  disruptions?: Record<string, DisruptionItem>;
}

// Run Pattern (stopping pattern)
export interface PatternDeparture {
  stop_id?: number;
  route_id?: number;
  run_id?: number;
  run_ref?: string;
  direction_id?: number;
  disruption_ids?: number[];
  scheduled_departure_utc?: string;
  estimated_departure_utc?: string | null;
  at_platform?: boolean;
  platform_number?: string | null;
  departure_sequence?: number;
  skipped_stops?: ExpandedStop[];
}

export interface RunResponse extends ApiResponseBase {
  departures?: PatternDeparture[];
  stops?: Record<string, ExpandedStop>;
  routes?: Record<string, ExpandedRoute>;
  runs?: Record<string, ExpandedRun>;
  directions?: Record<string, ExpandedDirection>;
}

// Disruptions
export interface DisruptionRoute {
  route_type?: number;
  route_id?: number;
  route_name?: string;
  route_number?: string;
  route_gtfs_id?: string;
  direction?: {
    route_direction_id?: number;
    direction_id?: number;
    direction_name?: string;
    service_time?: string;
  };
}

export interface DisruptionStop {
  stop_id?: number;
  stop_name?: string;
}

export interface DisruptionItem {
  disruption_id?: number;
  title?: string;
  url?: string;
  description?: string;
  disruption_status?: string;
  disruption_type?: string;
  published_on?: string;
  last_updated?: string;
  from_date?: string;
  to_date?: string;
  routes?: DisruptionRoute[];
  stops?: DisruptionStop[];
  colour?: string;
  display_on_board?: boolean;
  display_status?: boolean;
}

export interface DisruptionsResponse extends ApiResponseBase {
  disruptions?: {
    metro_train?: DisruptionItem[];
    metro_tram?: DisruptionItem[];
    metro_bus?: DisruptionItem[];
    regional_train?: DisruptionItem[];
    regional_coach?: DisruptionItem[];
    regional_bus?: DisruptionItem[];
    school_bus?: DisruptionItem[];
    telebus?: DisruptionItem[];
    night_bus?: DisruptionItem[];
    ferry?: DisruptionItem[];
    interstate_train?: DisruptionItem[];
    skybus?: DisruptionItem[];
    taxi?: DisruptionItem[];
    general?: DisruptionItem[];
  };
}

// Vehicle Positions (if available)
export interface VehiclePosition {
  latitude?: number;
  longitude?: number;
  easting?: number;
  northing?: number;
  direction?: number;
  bearing?: number;
  supplier?: string;
  datetime_utc?: string;
  expiry_time?: string;
}

export interface VehicleDescriptor {
  operator?: string;
  id?: string;
  low_floor?: boolean;
  air_conditioned?: boolean;
  description?: string;
}

export interface VehicleRun {
  run_id?: number;
  run_ref?: string;
  route_id?: number;
  route_type?: number;
  final_stop_id?: number;
  destination_name?: string;
  status?: string;
  direction_id?: number;
  vehicle_position?: VehiclePosition;
  vehicle_descriptor?: VehicleDescriptor;
}

export interface RunsResponse extends ApiResponseBase {
  runs?: VehicleRun[];
}
