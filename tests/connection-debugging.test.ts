/*
  Connection-Aware Journey Planning Diagnostic Tests
  
  These tests use the production PTV API to diagnose why the Bendigo → Flinders Street
  connection-aware planning is failing despite V/Line services being available.
  
  Test scenarios:
  1. Stop resolution for Bendigo and Flinders Street
  2. Direct route finding between these stops
  3. Journey timing engine step-by-step debugging
  4. V/Line vs Metro route type handling
  5. Stopping pattern retrieval for V/Line services
*/

import { describe, test, expect, beforeEach } from 'bun:test';
import { NextTrainTool } from '../src/features/next_train/tool';
import { JourneyTimingEngine } from '../src/features/journey-planning/journey-timing-engine';
import { PtvClient } from '../src/ptv/client';
import { ROUTE_TYPE } from '../src/ptv/types';

describe('Connection-Aware Journey Planning Diagnostics', () => {
  let ptvClient: PtvClient;
  let nextTrainTool: NextTrainTool;
  let journeyEngine: JourneyTimingEngine;
  
  const skipIfNoCredentials = () => {
    if (!process.env.PTV_DEV_ID || !process.env.PTV_API_KEY) {
      console.warn('⚠️ Skipping test - PTV API credentials not available');
      return true;
    }
    return false;
  };

  beforeEach(() => {
    if (!skipIfNoCredentials()) {
      // Initialize with production API credentials from .env
      ptvClient = new PtvClient();
      nextTrainTool = new NextTrainTool(ptvClient);
      journeyEngine = new JourneyTimingEngine(ptvClient);
    }
  });

  test('should resolve Bendigo and Flinders Street stops correctly', async () => {
    if (skipIfNoCredentials()) return;
    
    console.log('\n🔍 Testing stop resolution...');
    
    // Test Bendigo stop resolution
    const bendigoStops = await ptvClient.findTrainStops('Bendigo');
    console.log(`Bendigo stops found: ${bendigoStops.length}`);
    bendigoStops.forEach((stop, i) => {
      console.log(`  ${i + 1}. ${stop.stop_name} (ID: ${stop.stop_id}, Type: ${stop.route_type})`);
    });
    
    // Test Flinders Street stop resolution
    const flindersStops = await ptvClient.findTrainStops('Flinders Street');
    console.log(`Flinders Street stops found: ${flindersStops.length}`);
    flindersStops.forEach((stop, i) => {
      console.log(`  ${i + 1}. ${stop.stop_name} (ID: ${stop.stop_id}, Type: ${stop.route_type})`);
    });
    
    expect(bendigoStops.length).toBeGreaterThan(0);
    expect(flindersStops.length).toBeGreaterThan(0);
    
    // Check if compatible stop pair can be found
    if (typeof ptvClient.findCompatibleStopPair === 'function') {
      const stopPair = await ptvClient.findCompatibleStopPair('Bendigo', 'Flinders Street');
      console.log(`Compatible stop pair: ${stopPair ? 'Found' : 'Not found'}`);
      if (stopPair) {
        console.log(`  Origin: ${stopPair.origin.stop_name} (${stopPair.origin.route_type})`);
        console.log(`  Destination: ${stopPair.destination.stop_name} (${stopPair.destination.route_type})`);
      }
    }
  });

  test('should find direct routes between Bendigo and Flinders Street', async () => {
    if (skipIfNoCredentials()) return;
    
    console.log('\n🛤️  Testing direct route discovery...');
    
    const bendigoStops = await ptvClient.findTrainStops('Bendigo');
    const flindersStops = await ptvClient.findTrainStops('Flinders Street');
    
    expect(bendigoStops.length).toBeGreaterThan(0);
    expect(flindersStops.length).toBeGreaterThan(0);
    
    const bendigoStop = bendigoStops[0];
    const flindersStop = flindersStops[0];
    
    console.log(`Testing route connection: ${bendigoStop?.stop_name} → ${flindersStop?.stop_name}`);
    
    // Check what routes serve each stop
    console.log('Routes serving Bendigo:');
    const bendigoRoutes = bendigoStop?.routes || [];
    bendigoRoutes.forEach(route => {
      console.log(`  - ${route.route_name} (ID: ${route.route_id}, Type: ${route.route_type})`);
    });
    
    console.log('Routes serving Flinders Street:');
    const flindersRoutes = flindersStop?.routes || [];
    flindersRoutes.forEach(route => {
      console.log(`  - ${route.route_name} (ID: ${route.route_id}, Type: ${route.route_type})`);
    });
    
    // Look for common routes
    const commonRoutes = bendigoRoutes.filter(bendigoRoute =>
      flindersRoutes.some(flindersRoute => flindersRoute.route_id === bendigoRoute.route_id)
    );
    
    console.log(`Common routes: ${commonRoutes.length}`);
    commonRoutes.forEach(route => {
      console.log(`  - ${route.route_name} (ID: ${route.route_id}, Type: ${route.route_type})`);
    });
    
    // This should be 0 - confirming no direct route exists
    expect(commonRoutes.length).toBe(0);
  });

  test('should test V/Line departures from Bendigo', async () => {
    if (skipIfNoCredentials()) return;
    
    console.log('\n🚂 Testing V/Line departures from Bendigo...');
    
    const bendigoStops = await ptvClient.findTrainStops('Bendigo');
    const bendigoStop = bendigoStops[0];
    
    if (!bendigoStop) {
      console.log('❌ No Bendigo stop found');
      return;
    }
    
    console.log(`Testing departures from: ${bendigoStop.stop_name} (ID: ${bendigoStop.stop_id})`);
    
    try {
      // Try V/Line departures
      const vlineDepartures = await ptvClient.getDepartures(
        ROUTE_TYPE.VLINE,
        bendigoStop.stop_id!,
        {
          max_results: 5,
          expand: ['run', 'route', 'stop']
        }
      );
      
      console.log(`V/Line departures found: ${vlineDepartures.departures?.length || 0}`);
      vlineDepartures.departures?.slice(0, 3).forEach((dep, i) => {
        console.log(`  ${i + 1}. ${dep.scheduled_departure_utc} (Run: ${dep.run_ref})`);
      });
      
      // Also try Metro departures (should be 0)
      const metroDepartures = await ptvClient.getDepartures(
        ROUTE_TYPE.TRAIN,
        bendigoStop.stop_id!,
        {
          max_results: 5,
          expand: ['run', 'route', 'stop']
        }
      );
      
      console.log(`Metro departures found: ${metroDepartures.departures?.length || 0}`);
      
    } catch (error) {
      console.log('❌ Error getting departures:', error);
    }
  });

  test('should test stopping pattern retrieval for V/Line run', async () => {
    if (skipIfNoCredentials()) return;
    
    console.log('\n🗺️  Testing V/Line stopping pattern retrieval...');
    
    const bendigoStops = await ptvClient.findTrainStops('Bendigo');
    const bendigoStop = bendigoStops[0];
    
    if (!bendigoStop) {
      console.log('❌ No Bendigo stop found');
      return;
    }
    
    try {
      // Get a V/Line departure
      const vlineDepartures = await ptvClient.getDepartures(
        ROUTE_TYPE.VLINE,
        bendigoStop.stop_id!,
        {
          max_results: 1,
          expand: ['run', 'route', 'stop']
        }
      );
      
      const firstDeparture = vlineDepartures.departures?.[0];
      if (!firstDeparture?.run_ref) {
        console.log('❌ No V/Line departure with run_ref found');
        return;
      }
      
      console.log(`Testing stopping pattern for run: ${firstDeparture.run_ref}`);
      
      // Get stopping pattern
      const stoppingPattern = await ptvClient.getRunPattern(firstDeparture.run_ref, ROUTE_TYPE.VLINE, {
        expand: [1, 2] // STOP, ROUTE
      });
      
      console.log(`Stopping pattern stops: ${stoppingPattern.departures?.length || 0}`);
      
      // Look for Southern Cross in the stopping pattern
      const southernCrossStop = stoppingPattern.departures?.find(dep => 
        dep.stop_id === 1181 // Southern Cross Station ID
      );
      
      if (southernCrossStop) {
        console.log('✅ Southern Cross found in stopping pattern:');
        console.log(`  Stop ID: ${southernCrossStop.stop_id}`);
        console.log(`  Scheduled arrival: ${southernCrossStop.scheduled_departure_utc}`);
        console.log(`  Platform: ${southernCrossStop.platform_number || 'Unknown'}`);
      } else {
        console.log('❌ Southern Cross NOT found in stopping pattern');
        console.log('Stops in pattern:');
        stoppingPattern.departures?.slice(0, 10).forEach(dep => {
          console.log(`  - Stop ${dep.stop_id}: ${dep.scheduled_departure_utc}`);
        });
      }
      
    } catch (error) {
      console.log('❌ Error getting stopping pattern:', error);
    }
  });

  test('should test metro departures from Southern Cross to Flinders Street', async () => {
    if (skipIfNoCredentials()) return;
    
    console.log('\n🚇 Testing metro connection: Southern Cross → Flinders Street...');
    
    const southernCrossId = 1181; // Known Southern Cross Station ID
    const flindersStops = await ptvClient.findTrainStops('Flinders Street');
    const flindersStop = flindersStops[0];
    
    if (!flindersStop) {
      console.log('❌ No Flinders Street stop found');
      return;
    }
    
    console.log(`Testing metro departures from Southern Cross (${southernCrossId}) to Flinders Street`);
    
    try {
      // Get metro departures from Southern Cross
      const metroDepartures = await ptvClient.getDepartures(
        ROUTE_TYPE.TRAIN,
        southernCrossId,
        {
          max_results: 5,
          expand: ['run', 'route', 'stop']
        }
      );
      
      console.log(`Metro departures from Southern Cross: ${metroDepartures.departures?.length || 0}`);
      
      if (metroDepartures.departures && metroDepartures.departures.length > 0) {
        const firstDeparture = metroDepartures.departures[0];
        console.log(`Testing run: ${firstDeparture.run_ref}`);
        
        // Get stopping pattern for metro run
        const stoppingPattern = await ptvClient.getRunPattern(firstDeparture.run_ref!, ROUTE_TYPE.TRAIN, {
          expand: [1, 2] // STOP, ROUTE
        });
        
        // Look for Flinders Street in the stopping pattern
        const flindersInPattern = stoppingPattern.departures?.find(dep => 
          dep.stop_id === flindersStop.stop_id
        );
        
        if (flindersInPattern) {
          console.log('✅ Flinders Street found in metro stopping pattern:');
          console.log(`  Stop ID: ${flindersInPattern.stop_id}`);
          console.log(`  Scheduled arrival: ${flindersInPattern.scheduled_departure_utc}`);
        } else {
          console.log('❌ Flinders Street NOT found in metro stopping pattern');
        }
      }
      
    } catch (error) {
      console.log('❌ Error testing metro connection:', error);
    }
  });

  test('should run journey timing engine step by step', async () => {
    if (skipIfNoCredentials()) return;
    
    console.log('\n🛠️  Testing Journey Timing Engine step by step...');
    
    const bendigoStops = await ptvClient.findTrainStops('Bendigo');
    const flindersStops = await ptvClient.findTrainStops('Flinders Street');
    
    if (!bendigoStops.length || !flindersStops.length) {
      console.log('❌ Could not find required stops');
      return;
    }
    
    const request = {
      origin_stop_id: bendigoStops[0]!.stop_id!,
      destination_stop_id: flindersStops[0]!.stop_id!,
      max_results: 1,
      search_window_minutes: 300 // 5 hour window
    };
    
    console.log(`Journey request: ${request.origin_stop_id} → ${request.destination_stop_id}`);
    
    try {
      const result = await journeyEngine.planTwoLegJourney(request);
      
      console.log(`Journey planning result:`);
      console.log(`  Journeys found: ${result.journeys.length}`);
      console.log(`  Error code: ${result.error_code || 'None'}`);
      console.log(`  Error message: ${result.error_message || 'None'}`);
      console.log(`  Metadata:`, result.metadata);
      
      if (result.journeys.length > 0) {
        const journey = result.journeys[0]!;
        console.log('✅ Journey found:');
        console.log(`  Total time: ${journey.total_journey_minutes} minutes`);
        console.log(`  Legs: ${journey.legs.length}`);
        console.log(`  Connections: ${journey.connections.length}`);
        console.log(`  Warnings: ${journey.warnings.length}`);
      }
      
    } catch (error) {
      console.log('❌ Journey timing engine error:', error);
    }
  });

  test('should test NextTrainTool end-to-end', async () => {
    if (skipIfNoCredentials()) return;
    
    console.log('\n🎯 Testing NextTrainTool end-to-end...');
    
    const input = {
      origin: 'Bendigo',
      destination: 'Flinders Street',
      allowConnections: true,
      maxConnections: 1
    };
    
    console.log('Testing NextTrain input:', input);
    
    try {
      const result = await nextTrainTool.execute(input);
      
      console.log('NextTrain result:');
      console.log(`  Success: ${!result.data.error_code}`);
      console.log(`  Error code: ${result.data.error_code || 'None'}`);
      console.log(`  Is direct: ${result.data.is_direct}`);
      console.log(`  Legs: ${result.data.legs?.length || 0}`);
      console.log(`  Connections: ${result.data.connections?.length || 0}`);
      console.log(`  Metadata:`, result.metadata);
      
      if (result.data.legs && result.data.legs.length > 0) {
        console.log('Journey legs:');
        result.data.legs.forEach((leg, i) => {
          console.log(`  Leg ${i + 1}: ${leg.origin_stop_name} → ${leg.destination_stop_name}`);
          console.log(`    Route: ${leg.route_name} (${leg.route_type})`);
          console.log(`    Departure: ${leg.departure_local}`);
          console.log(`    Arrival: ${leg.arrival_local}`);
        });
      }
      
    } catch (error) {
      console.log('❌ NextTrain tool error:', error);
    }
  });
});