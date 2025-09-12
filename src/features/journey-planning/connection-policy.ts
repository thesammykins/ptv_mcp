/*
  Connection Policy Engine
  Determines minimum connection times between train services based on:
  - Route types (metro vs V/Line)
  - Station-specific policies
  - Platform proximity when available
*/

import { ROUTE_TYPE } from '../../ptv/types';
import { ConnectionValidityStatus } from '../../ptv/types';

interface ConnectionPolicyConfig {
  default_policies: {
    metro_to_metro: number;
    metro_to_vline: number;
    vline_to_metro: number;
    vline_to_vline: number;
  };
  station_overrides: Record<string, {
    name: string;
    policies: Record<string, number>;
    platform_groups?: Record<string, string[]>;
  }>;
  interchange_candidates: Record<string, {
    default_interchange: string;
    alternatives: string[];
    description: string;
  }>;
  tight_connection_threshold: number;
  warnings: Record<string, string>;
}

class ConnectionPolicyEngine {
  private config: ConnectionPolicyConfig;

  constructor() {
    // Load from JSON config file
    this.config = require('../../config/connection-policy.json');
  }

  /**
   * Calculate minimum connection time between two legs
   */
  getMinConnectionTime(
    interchangeStopId: number,
    fromRouteType: number,
    toRouteType: number,
    fromPlatform?: string,
    toPlatform?: string
  ): number {
    const stationConfig = this.config.station_overrides[interchangeStopId.toString()];
    
    // Use station-specific policies if available
    if (stationConfig) {
      return this.getStationSpecificConnectionTime(
        stationConfig,
        fromRouteType,
        toRouteType,
        fromPlatform,
        toPlatform
      );
    }
    
    // Fall back to default policies
    return this.getDefaultConnectionTime(fromRouteType, toRouteType);
  }

  /**
   * Apply station-specific connection policies
   */
  private getStationSpecificConnectionTime(
    stationConfig: any,
    fromRouteType: number,
    toRouteType: number,
    fromPlatform?: string,
    toPlatform?: string
  ): number {
    const policies = stationConfig.policies;
    
    // Check for platform-specific policies first
    if (fromPlatform && toPlatform && stationConfig.platform_groups) {
      const platformTime = this.getPlatformSpecificTime(
        stationConfig.platform_groups,
        policies,
        fromPlatform,
        toPlatform
      );
      if (platformTime > 0) return platformTime;
    }
    
    // Check route type combinations
    const routeTypeKey = this.getRouteTypeKey(fromRouteType, toRouteType);
    if (policies[routeTypeKey]) {
      return policies[routeTypeKey];
    }
    
    // Fall back to default for this station
    if (policies.metro_to_metro) {
      return policies.metro_to_metro;
    }
    
    return this.getDefaultConnectionTime(fromRouteType, toRouteType);
  }

  /**
   * Calculate connection time based on platform proximity
   */
  private getPlatformSpecificTime(
    platformGroups: Record<string, string[]>,
    policies: Record<string, number>,
    fromPlatform: string,
    toPlatform: string
  ): number {
    // Same platform - minimum time
    if (fromPlatform === toPlatform && policies.same_platform) {
      return policies.same_platform;
    }
    
    // Check if platforms are in same group (e.g., both V/Line)
    for (const [groupName, platforms] of Object.entries(platformGroups)) {
      if (platforms.includes(fromPlatform) && platforms.includes(toPlatform)) {
        return policies.same_platform || policies.cross_platform || 0;
      }
    }
    
    // Different platform groups - longer time
    if (policies.cross_platform) {
      return policies.cross_platform;
    }
    
    return 0; // No specific policy found
  }

  /**
   * Get default connection times based on route types
   */
  private getDefaultConnectionTime(fromRouteType: number, toRouteType: number): number {
    const key = this.getRouteTypeKey(fromRouteType, toRouteType);
    return this.config.default_policies[key as keyof typeof this.config.default_policies] || 8;
  }

  /**
   * Convert route types to policy key
   */
  private getRouteTypeKey(fromRouteType: number, toRouteType: number): string {
    const from = fromRouteType === ROUTE_TYPE.TRAIN ? 'metro' : 'vline';
    const to = toRouteType === ROUTE_TYPE.TRAIN ? 'metro' : 'vline';
    return `${from}_to_${to}`;
  }

  /**
   * Validate connection timing and determine status
   */
  validateConnection(
    actualWaitMinutes: number,
    minRequiredMinutes: number
  ): {
    status: ConnectionValidityStatus;
    warning?: string;
  } {
    const buffer = actualWaitMinutes - minRequiredMinutes;
    
    if (buffer < 0) {
      return {
        status: ConnectionValidityStatus.INFEASIBLE,
        warning: 'Connection time insufficient - service will have departed'
      };
    }
    
    if (buffer <= this.config.tight_connection_threshold) {
      return {
        status: ConnectionValidityStatus.TIGHT,
        warning: this.config.warnings.tight_connection
      };
    }
    
    return {
      status: ConnectionValidityStatus.FEASIBLE
    };
  }

  /**
   * Get preferred interchange stations for a journey type
   */
  getPreferredInterchanges(journeyType: string): string[] {
    const candidates = this.config.interchange_candidates[journeyType];
    if (!candidates) return [];
    
    return [candidates.default_interchange, ...candidates.alternatives];
  }

  /**
   * Get Southern Cross Station ID (main V/Line interchange)
   */
  getSouthernCrossStationId(): number {
    return 1181;
  }

  /**
   * Get Flinders Street Station ID (main metro interchange)
   */
  getFlindersStreetStationId(): number {
    return 1071;
  }
}

// Export singleton instance
export const connectionPolicy = new ConnectionPolicyEngine();
export { ConnectionPolicyEngine };