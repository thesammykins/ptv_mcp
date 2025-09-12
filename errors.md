🚂 PTV MCP Tools Test Script
================================

✅ Configuration loaded successfully
📡 PTV Base URL: https://timetableapi.ptv.vic.gov.au
📡 Realtime: ENABLED
🔑 Realtime API key configured: true

🔧 Testing PTV API connectivity...
✅ API connectivity OK - found 1 stops

🔍 Test 1: Next Train Tool
---------------------------
🔍 Searching for stops: Flinders Street → South Morang
✅ Resolved stops: Flinders Street Station (1071) → Hawkstowe Station (1227)
🛤️  Found 1 connecting routes: [ "Mernda" ]
   ⏰ 0 departures within 30-minute window
   ⏰ 2 departures within 30-minute window
🚂 Next departure: Mernda at 2025-09-11T00:29:00Z
✅ Next train result:
   🚂 Route: Mernda
   ⏰ Departure: 2025-09-11T00:29:00Z
   🚉 Platform: 1
   📊 Metadata: 452ms, 6 API calls

📅 Test 2: Line Timetable Tool
-------------------------------
🚉 Getting timetable: Flinders Street → Hurstbridge (60 mins)
✅ Resolved stop: Flinders Street Station (1071)
✅ Found route: Hurstbridge (8)
🧭 Using 1 direction(s): [ "City" ]
↩️  No departures for direction "Up"; trying opposite direction.
🚂 Found 3 departures in the next 60 minutes
✅ Line timetable result:
   🚉 Stop: Flinders Street Station
   🚂 Route: Hurstbridge
   📋 Found 3 departures
   ⏰ Next: 2025-09-11T00:39:00Z (Platform 1)
   📊 Metadata: 493ms

📍 Test 3: How Far Tool
------------------------
🚄 How far: Craigieburn approaching Melbourne Central
✅ Resolved stop: Melbourne Central Station (1120)
✅ Found route: Craigieburn (3)
🧭 Searching 1 direction(s): [ "City" ]
🚂 Found vehicle for run 953243: 1006.32975377122m away, 1.3417730050282934min ETA
🚂 Found vehicle for run 953251: 7284.199209166155m away, 9.71226561222154min ETA
🚂 Found vehicle for run 953253: 19435.56848797557m away, 25.914091317300763min ETA
🚂 Found vehicle for run 953257: 23474.719055120877m away, 31.299625406827836min ETA
🚂 Found vehicle for run 953259: 20462.438671898653m away, 27.283251562531536min ETA
🚂 Found vehicle for run 953263: 8302.529751726717m away, 11.070039668968956min ETA
🚂 Found vehicle for run 953265: 1188.2131194524259m away, 1.5842841592699013min ETA
🚂 Found vehicle for run 953267: 3137.4326560705417m away, 4.183243541427389min ETA
🚂 Found vehicle for run 953269: 12868.009784606384m away, 17.15734637947518min ETA
🚂 Found vehicle for run 953862: 8625.72347927815m away, 11.500964639037532min ETA
🚂 Found vehicle for run 953866: 2867.080514139968m away, 3.8227740188532904min ETA
🚂 Found vehicle for run 953868: 1006.32975377122m away, 1.3417730050282934min ETA
🚂 Found vehicle for run 953870: 7284.199209166155m away, 9.71226561222154min ETA
🚂 Found vehicle for run 953872: 19435.56848797557m away, 25.914091317300763min ETA
🚂 Found vehicle for run 953874: 20462.438671898653m away, 27.283251562531536min ETA
🚂 Found vehicle for run 953876: 8302.529751726717m away, 11.070039668968956min ETA
🚂 Found vehicle for run 953878: 1188.2131194524259m away, 1.5842841592699013min ETA
✅ How far result:
   🚉 Stop: Melbourne Central Station
   ℹ️  No approaching trains detected
   📊 Source: realtime

🌐 Realtime API GET https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/trip-updates (rtapi-1757550093886-pfpq58kpq)
✅ Realtime API success: 200 (rtapi-1757550093886-pfpq58kpq)
🔐 Realtime key validation: VALID (header: KeyID)
📡 Test 4: Next Train Realtime
-------------------------------
🔄 Enhanced NextTrain with realtime data: Southern Cross → South Morang
🔍 Searching for stops: Southern Cross → South Morang
✅ Resolved stops: Southern Cross Station (1181) → Hawkstowe Station (1227)
📊 Loading GTFS static data...
🗓️  Cached GTFS service window expired; downloading fresh data...
📥 Downloading fresh GTFS static data...
📥 Downloading GTFS static data from Transport Victoria...
✅ Downloaded GTFS ZIP: 172.5 MB
📂 Extracting GTFS ZIP archive...
🔍 Analyzing ZIP structure...
📦 Found 8 nested GTFS files, processing all...
📂 Extracting 1/google_transit.zip...
✅ Extracted 1/google_transit.zip: levels.txt, shapes.txt, calendar_dates.txt, trips.txt, stop_times.txt, calendar.txt, transfers.txt, pathways.txt, stops.txt, agency.txt, routes.txt
📂 Extracting 2/google_transit.zip...
✅ Extracted 2/google_transit.zip: levels.txt, shapes.txt, calendar_dates.txt, trips.txt, stop_times.txt, calendar.txt, transfers.txt, pathways.txt, stops.txt, agency.txt, routes.txt
📂 Extracting 3/google_transit.zip...
✅ Extracted 3/google_transit.zip: levels.txt, shapes.txt, calendar_dates.txt, trips.txt, stop_times.txt, calendar.txt, transfers.txt, pathways.txt, stops.txt, agency.txt, routes.txt
📂 Extracting 10/google_transit.zip...
✅ Extracted 10/google_transit.zip: levels.txt, shapes.txt, calendar_dates.txt, trips.txt, stop_times.txt, calendar.txt, transfers.txt, pathways.txt, stops.txt, agency.txt, routes.txt
📂 Extracting 11/google_transit.zip...
✅ Extracted 11/google_transit.zip: levels.txt, shapes.txt, calendar_dates.txt, trips.txt, stop_times.txt, calendar.txt, transfers.txt, pathways.txt, stops.txt, agency.txt, routes.txt
📂 Extracting 6/google_transit.zip...
✅ Extracted 6/google_transit.zip: levels.txt, shapes.txt, calendar_dates.txt, trips.txt, stop_times.txt, calendar.txt, transfers.txt, pathways.txt, stops.txt, agency.txt, routes.txt
📂 Extracting 4/google_transit.zip...
✅ Extracted 4/google_transit.zip: levels.txt, shapes.txt, calendar_dates.txt, trips.txt, stop_times.txt, calendar.txt, transfers.txt, pathways.txt, stops.txt, agency.txt, routes.txt
📂 Extracting 5/google_transit.zip...
✅ Extracted 5/google_transit.zip: levels.txt, shapes.txt, calendar_dates.txt, trips.txt, stop_times.txt, calendar.txt, transfers.txt, pathways.txt, stops.txt, agency.txt, routes.txt
📦 Found 8 nested GTFS archives to parse
📅 Parsing calendar.txt...
📆 Parsing calendar_dates.txt...
📅 Parsing calendar.txt...
📆 Parsing calendar_dates.txt...
📅 Parsing calendar.txt...
📆 Parsing calendar_dates.txt...
📅 Parsing calendar.txt...
📆 Parsing calendar_dates.txt...
📅 Parsing calendar.txt...
📆 Parsing calendar_dates.txt...
📅 Parsing calendar.txt...
📆 Parsing calendar_dates.txt...
📅 Parsing calendar.txt...
📆 Parsing calendar_dates.txt...
📅 Parsing calendar.txt...
📆 Parsing calendar_dates.txt...
🛑 Parsing stops.txt...
🛤️  Parsing routes.txt...
🧭 Parsing trips.txt...
🏢 Parsing agency.txt...
⏩ Skipping eager parse of stop_times.txt (will stream on demand)
🛑 Parsing stops.txt...
🛤️  Parsing routes.txt...
🧭 Parsing trips.txt...
🏢 Parsing agency.txt...
⏩ Skipping eager parse of stop_times.txt (will stream on demand)
🛑 Parsing stops.txt...
🛤️  Parsing routes.txt...
🧭 Parsing trips.txt...
🏢 Parsing agency.txt...
⏩ Skipping eager parse of stop_times.txt (will stream on demand)
🛑 Parsing stops.txt...
🛤️  Parsing routes.txt...
🧭 Parsing trips.txt...
🏢 Parsing agency.txt...
⏩ Skipping eager parse of stop_times.txt (will stream on demand)
🛑 Parsing stops.txt...
🛤️  Parsing routes.txt...
🧭 Parsing trips.txt...
🏢 Parsing agency.txt...
⏩ Skipping eager parse of stop_times.txt (will stream on demand)
🛑 Parsing stops.txt...
🛤️  Parsing routes.txt...
🧭 Parsing trips.txt...
🏢 Parsing agency.txt...
⏩ Skipping eager parse of stop_times.txt (will stream on demand)
🛑 Parsing stops.txt...
🛤️  Parsing routes.txt...
🧭 Parsing trips.txt...
🏢 Parsing agency.txt...
⏩ Skipping eager parse of stop_times.txt (will stream on demand)
🛑 Parsing stops.txt...
🛤️  Parsing routes.txt...
🧭 Parsing trips.txt...
🏢 Parsing agency.txt...
⏩ Skipping eager parse of stop_times.txt (will stream on demand)
✅ Parsed GTFS: 1 stops, 1 routes, 234285 trips
💽 Wrote GTFS index to disk
✅ GTFS data loaded: 1 stops, 1 routes, 234285 trips
🗓️  GTFS Service Window: 20250905 → 20251207
✅ GTFS data loaded: 1 stops, 1 routes, 234285 trips
📡 Fetching real-time trip updates...
🌐 Realtime API GET https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/trip-updates (rtapi-1757550102449-mohkuqoth)
✅ Realtime API success: 200 (rtapi-1757550102449-mohkuqoth)
✅ Retrieved 237 real-time trip updates
🛤️  Found 1 connecting routes: [ "Mernda" ]
🚂 Fetching real-time vehicle positions...
🌐 Realtime API GET https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/vehicle-positions (rtapi-1757550102590-lscbyieyd)
✅ Realtime API success: 200 (rtapi-1757550102590-lscbyieyd)
✅ Retrieved 120 vehicle positions
⚠️  Fetching service alerts...
🌐 Realtime API GET https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/service-alerts (rtapi-1757550102774-83rflllvo)
✅ Realtime API success: 200 (rtapi-1757550102774-83rflllvo)
✅ Retrieved 26 service alerts
🚂 Next departure: Mernda at 2025-09-11T00:34:00Z
   ✅ Mernda → departs 2025-09-11T00:34:00Z
📡 Test 5: Line Timetable Realtime
-----------------------------------
🔄 Enhanced LineTimetable with realtime: Flinders Street → Hurstbridge (60 mins)
✅ Resolved stop: Flinders Street Station (1071)
📊 Loading GTFS static data...
🗓️  Cached GTFS service window expired; downloading fresh data...
⏰ Throttling GTFS download (last download 0.1 minutes ago)
📦 Using throttled GTFS cache...
💾 Loaded GTFS index from disk
✅ GTFS data loaded: 1 stops, 1 routes, 234285 trips
✅ GTFS data loaded: 1 stops, 1 routes, 234285 trips
✅ Found route: Hurstbridge (8)
📡 Fetching real-time data...
🌐 Realtime API GET https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/trip-updates (rtapi-1757550103291-ux98xacbs)
🌐 Realtime API GET https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/vehicle-positions (rtapi-1757550103291-8ht1cgbz2)
🌐 Realtime API GET https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/service-alerts (rtapi-1757550103291-3kt8a3ulb)
✅ Realtime API success: 200 (rtapi-1757550103291-3kt8a3ulb)
✅ Realtime API success: 200 (rtapi-1757550103291-ux98xacbs)
✅ Realtime API success: 200 (rtapi-1757550103291-8ht1cgbz2)
✅ Retrieved realtime data: 237 trip updates, 120 vehicle positions, 26 alerts
🧭 Using 1 direction(s): [ "City" ]
↩️  No departures for direction "Up"; trying opposite direction.
🚂 Found 3 departures with realtime enhancements in the next 60 minutes
   ✅ Departures (RT-enhanced): 3
📡 Test 6: How Far Realtime
----------------------------
🚄 Enhanced HowFar with GPS tracking: Hurstbridge approaching Flinders Street
✅ Resolved stop: Flinders Street Station (1071)
📊 Loading GTFS static data...
🗓️  Cached GTFS service window expired; downloading fresh data...
⏰ Throttling GTFS download (last download 0.1 minutes ago)
📦 Using throttled GTFS cache...
💾 Loaded GTFS index from disk
✅ GTFS data loaded: 1 stops, 1 routes, 234285 trips
✅ GTFS data loaded: 1 stops, 1 routes, 234285 trips
✅ Found route: Hurstbridge (8)
🧭 Searching 1 direction(s): [ "City" ]
🚂 Fetching real-time vehicle data...
🌐 Realtime API GET https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/vehicle-positions (rtapi-1757550103896-pywiz0e4z)
🌐 Realtime API GET https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/trip-updates (rtapi-1757550103896-mg0kh2ybz)
✅ Realtime API success: 200 (rtapi-1757550103896-mg0kh2ybz)
✅ Realtime API success: 200 (rtapi-1757550103896-pywiz0e4z)
✅ Retrieved 120 vehicle positions, 237 trip updates
🚂 Found vehicle for run 2: 17.48788114465828m away, 0min ETA
   ✅ Data source: undefined, vehicleTracking: true
📡 Test 7: Vehicle Tracker
---------------------------
🚂 Tracking vehicles: {}
🌐 Realtime API GET https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/vehicle-positions (rtapi-1757550104101-7yopruwzm)
✅ Realtime API success: 200 (rtapi-1757550104101-7yopruwzm)
✅ Retrieved 120 vehicle positions
   ✅ Vehicles returned: 0
📡 Test 8: Disruption Monitor
------------------------------
⚠️  Monitoring service disruptions: {
  includeAll: true,
}
🌐 Realtime API GET https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/service-alerts (rtapi-1757550104218-nq3mtscd4)
✅ Realtime API success: 200 (rtapi-1757550104218-nq3mtscd4)
✅ Retrieved 26 service alerts
   ✅ Alerts returned: 26
📡 Test 9: Geo Journey Planner
--------------------------------
🗺️  Planning geographic journey: {
  origin: {
    coordinates: [ 144.9631, -37.8136 ],
  },
  destination: {
    coordinates: [ 145.0876, -37.6359 ],
  },
  light: true,
}
💡 Geo planner running in LIGHT mode: skipping public_transport_lines download
✅ Retrieved 29202 stops
   ✅ Geo planner returned: 0 suggestions
🧭 Test 10: Plan Journey Mixed (Bendigo → South Morang)
------------------------------------------------------
🔄 Rebuilding GTFS SQLite (manifest changed)…
🗺️  Planning journey with mixed-mode support: Bendigo → South Morang
🗺️  Planning journey: Bendigo → South Morang
📦 Indexing branch 1: 1/google_transit.zip
✅ Resolved: Bendigo Railway Station  → Hawkstowe Station
📦 Indexing branch 2: 2/google_transit.zip
🏷️  Classification: origin=regional, destination=metro
📣 Disruptions fetched: 2 groups
   … 2 stop_times.txt: 250,000 rows
   … 2 stop_times.txt: 500,000 rows
📦 Indexing branch 3: 3/google_transit.zip
🔄 No direct connection, finding interchanges...
⚠️  DB-backed interchange discovery failed, falling back to PTV v3
   … 3 stop_times.txt: 250,000 rows
   … 3 stop_times.txt: 500,000 rows
   … 3 stop_times.txt: 750,000 rows
   … 3 stop_times.txt: 1,000,000 rows
   … 3 stop_times.txt: 1,250,000 rows
   … 3 stop_times.txt: 1,500,000 rows
   … 3 stop_times.txt: 1,750,000 rows
   … 3 stop_times.txt: 2,000,000 rows
📦 Indexing branch 10: 10/google_transit.zip
📦 Indexing branch 11: 11/google_transit.zip
📦 Indexing branch 6: 6/google_transit.zip
   … 6 stop_times.txt: 250,000 rows
   … 6 stop_times.txt: 500,000 rows
📦 Indexing branch 4: 4/google_transit.zip
   … 4 stop_times.txt: 250,000 rows
❌ PlanJourneyRealtime error: 174 |     // Step 3: Find interchange candidates
175 |     console.log(`🔄 No direct connection, finding interchanges...`);
176 |     const interchanges = await this.findInterchanges(origin, destination, preferredInterchanges);
177 |
178 |     if (interchanges.length === 0) {
179 |       throw new Error(`No viable interchange found between ${origin.stop_name} and ${destination.stop_name}`);
                  ^
error: No viable interchange found between Bendigo Railway Station  and Hawkstowe Station
      at planJourney (/Users/samanthamyers/Development/ptv_mcp/src/features/journey_planner/journey-planner.ts:179:13)

❌ Plan journey mixed failed: 174 |     // Step 3: Find interchange candidates
175 |     console.log(`🔄 No direct connection, finding interchanges...`);
176 |     const interchanges = await this.findInterchanges(origin, destination, preferredInterchanges);
177 |
178 |     if (interchanges.length === 0) {
179 |       throw new Error(`No viable interchange found between ${origin.stop_name} and ${destination.stop_name}`);
                  ^
error: No viable interchange found between Bendigo Railway Station  and Hawkstowe Station
      at planJourney (/Users/samanthamyers/Development/ptv_mcp/src/features/journey_planner/journey-planner.ts:179:13)

📊 Test Summary
================
✅ 9/9 tests passed
🎉 All tools working correctly!

💡 Tips:
   - Use these examples as templates for your own queries
   - Try different station names, routes, and directions
   - Check the JSON responses for all available data fields
   … 4 stop_times.txt: 500,000 rows
   … 4 stop_times.txt: 750,000 rows
   … 4 stop_times.txt: 1,000,000 rows
   … 4 stop_times.txt: 1,250,000 rows
   … 4 stop_times.txt: 1,500,000 rows
   … 4 stop_times.txt: 1,750,000 rows
   … 4 stop_times.txt: 2,000,000 rows
   … 4 stop_times.txt: 2,250,000 rows
   … 4 stop_times.txt: 2,500,000 rows
   … 4 stop_times.txt: 2,750,000 rows
   … 4 stop_times.txt: 3,000,000 rows
   … 4 stop_times.txt: 3,250,000 rows
   … 4 stop_times.txt: 3,500,000 rows
   … 4 stop_times.txt: 3,750,000 rows
   … 4 stop_times.txt: 4,000,000 rows
   … 4 stop_times.txt: 4,250,000 rows
   … 4 stop_times.txt: 4,500,000 rows
   … 4 stop_times.txt: 4,750,000 rows
   … 4 stop_times.txt: 5,000,000 rows
   … 4 stop_times.txt: 5,250,000 rows
   … 4 stop_times.txt: 5,500,000 rows
📦 Indexing branch 5: 5/google_transit.zip
✅ GTFS SQLite index built. Branch stats: {
  "1": {
    stops: 220,
    routes: 14,
    trips: 5455,
    stop_times: 67765,
    calendar: 17,
    calendar_dates: 0,
  },
  "2": {
    stops: 1058,
    routes: 35,
    trips: 33122,
    stop_times: 511704,
    calendar: 20,
    calendar_dates: 12,
  },
  "3": {
    stops: 1634,
    routes: 24,
    trips: 44775,
    stop_times: 2112975,
    calendar: 10,
    calendar_dates: 10,
  },
  "4": {
    stops: 18781,
    routes: 514,
    trips: 124684,
    stop_times: 5563167,
    calendar: 2878,
    calendar_dates: 29757,
  },
  "5": {
    stops: 887,
    routes: 56,
    trips: 3897,
    stop_times: 44049,
    calendar: 43,
    calendar_dates: 0,
  },
  "6": {
    stops: 6851,
    routes: 409,
    trips: 20979,
    stop_times: 545158,
    calendar: 109,
    calendar_dates: 194,
  },
  "10": {
    stops: 20,
    routes: 1,
    trips: 12,
    stop_times: 120,
    calendar: 12,
    calendar_dates: 0,
  },
  "11": {
    stops: 34,
    routes: 4,
    trips: 1361,
    stop_times: 5906,
    calendar: 8,
    calendar_dates: 29,
  },
}
