# AGENT.md - PTV MCP Server Agent Guide

This guide explains how AI agents can effectively use the PTV (Public Transport Victoria) MCP server tools to assist users with Melbourne train information.

## 🚂 Available Tools

The PTV MCP server provides three main tools for Melbourne train information:

### 1. `next-train` - Find the Next Train
**Purpose:** Find the next train departure within 30 minutes between two stations.

### 2. `line-timetable` - Get Line Timetable  
**Purpose:** Get upcoming departures for a specific route at a station within a time window.

### 3. `how-far` - Track Approaching Trains
**Purpose:** Find approaching trains with real-time GPS tracking and distance information.

---

## 🎯 Tool Usage Guidelines

### Understanding the 30-Minute Window

**CRITICAL:** All tools are designed to find trains **within the next 30 minutes**. This is not a bug—it's intentional behavior for practical "next train" queries.

- ✅ **Expected:** "No trains found" during off-peak hours or late night
- ✅ **Expected:** Tools focus on immediate departures, not full day schedules  
- ❌ **Don't:** Expect to find trains hours in advance with these tools

---

## 📋 Tool-Specific Instructions

### `next-train` Tool

**When to use:**
- User asks "When is the next train from X to Y?"
- User wants to travel between two specific stations
- User needs the quickest route with minimal transfers

**Parameters:**
```json
{
  "origin": "Station name (e.g., 'Flinders Street', 'South Morang')",
  "destination": "Station name (e.g., 'Richmond', 'Melbourne Central')",
  "time": "Optional: Melbourne time (e.g., '2:30 PM', '14:30', ISO format)"
}
```

**Understanding Responses:**
- `scheduledMelbourneTime`: Human-readable departure time ("Wed, 10 Sep at 12:09 pm")
- `minutesUntilDeparture`: Countdown in minutes (e.g., 6 minutes)
- `within30MinuteWindow`: Confirms train is within expected range
- `timing.currentTime`: Current Melbourne time for context

**Sample Response Interpretation:**
```json
{
  "departure": {
    "scheduledMelbourneTime": "Wed, 10 Sep at 12:09 pm",
    "minutesUntilDeparture": 6,
    "platform": "1"
  },
  "timing": {
    "currentTime": "Wed, 10 Sep at 12:02 pm",
    "within30MinuteWindow": true
  }
}
```

**Tell the user:** "The next train to South Morang departs from Platform 1 at 12:09 PM (in 6 minutes)."

---

### `line-timetable` Tool

**When to use:**
- User asks for "all trains on [line] in the next hour"
- User wants to see multiple departure options
- User planning with flexible timing

**Parameters:**
```json
{
  "stop": "Station name (e.g., 'Flinders Street')",
  "route": "Line name (e.g., 'Mernda', 'Frankston', 'Glen Waverley')",
  "direction": "Optional: 'inbound', 'outbound', 'up', 'down'",
  "duration": "Optional: Minutes (default 60, max 180)"
}
```

**Key Response Fields:**
- `departures[]`: Array of upcoming trains
- `disruptions[]`: Service alerts and maintenance notices  
- `timeWindow`: Confirms the search period

**Best Practice:** Always mention disruptions if present:
"Here are the next 3 Mernda line trains. Note: There are service disruptions affecting City Loop services from 9 PM."

---

### `how-far` Tool

**When to use:**
- User asks "How far away is the next train?"
- User wants real-time tracking information
- User is at a station waiting for a train

**Parameters:**
```json
{
  "stop": "Station name (e.g., 'Flinders Street')",
  "route": "Line name (e.g., 'Hurstbridge')",
  "direction": "Optional: 'inbound', 'outbound'"
}
```

**Understanding Real-time Data:**
- `distanceMeters`: Distance in meters (e.g., 40m = very close!)
- `eta`: Estimated time of arrival in minutes (e.g., 0.05 = 3 seconds)
- `accuracy`: "realtime" (GPS tracked) or "schedule" (estimated)
- `lastUpdated`: When GPS data was last received

**Sample Response:**
```json
{
  "approachingTrains": [{
    "distanceMeters": 40,
    "eta": 0.05,
    "accuracy": "realtime",
    "destination": "Parliament",
    "vehicle": {
      "description": "6 Car Xtrapolis"
    }
  }]
}
```

**Tell the user:** "The next train is just 40 meters away and will arrive in about 3 seconds! It's a 6-car Xtrapolis heading to Parliament."

---

## 🕐 Timezone Handling

### Melbourne Time Context
All tools automatically handle Melbourne timezone (AEST/AEDT) conversion:

- **Raw times:** Always in UTC for API compatibility (`2025-09-10T02:09:00Z`)
- **Display times:** Human-readable Melbourne time (`Wed, 10 Sep at 12:09 pm`)
- **Current time:** Provided for context (`timing.currentTime`)

### Agent Guidelines:
1. **Always use the `scheduledMelbourneTime` field** when telling users departure times
2. **Mention `minutesUntilDeparture`** for immediate context ("in 6 minutes")
3. **Reference `currentTime`** if users seem confused about timing
4. **Don't do manual UTC conversions** - the tools handle this automatically

---

## ⚠️ Error Handling

### Common Scenarios

**"No trains found within 30-minute window"**
- ✅ Normal during off-peak hours (late night, early morning)
- ✅ Normal for some routes with infrequent service
- **Response:** "No trains found in the next 30 minutes. Try checking the full timetable or consider alternative routes."

**"Stop not found"**  
- Check spelling of station names
- Try shortened versions ("Melbourne Central" vs "Melbourne Central Station")
- Suggest nearby stations

**"No route found connecting stations"**
- Stations may not be on the same line
- Suggest transfer options or alternative transport

### Service Disruptions
Always check the `disruptions[]` array and inform users of:
- Planned maintenance affecting services
- Service replacements (buses instead of trains)
- Platform or route changes

---

## 🚀 Best Practices for Agents

### 1. Context Awareness
```json
// Bad: Just show raw data
"Train departs 2025-09-10T02:09:00Z"

// Good: Provide context
"Your train departs at 12:09 PM (in 6 minutes) from Platform 1"
```

### 2. Progressive Information
```json
// Start simple, then add details
"Next train: Mernda line at 12:09 PM, Platform 1"
// Then add: "That's in 6 minutes. The train is a direct service with no changes required."
```

### 3. Proactive Guidance  
```json
// If disruptions exist
"I found your train, but there are service alerts affecting this line..."

// If outside 30-minute window
"No immediate trains found. Would you like me to check the full timetable instead?"
```

### 4. Real-time Emphasis
```json
// When real-time data is available
"Real-time update: Your train is running 1 minute late, now departing at 12:10 PM"

// When GPS tracking shows train nearby
"Your train is just 40 meters away - you should see it arriving any moment!"
```

---

## 🔧 Technical Integration

### Error Recovery
```json
// Always wrap tool calls in try-catch equivalent
try {
  const result = await call_mcp_tool("next-train", params);
  // Handle successful response
} catch (error) {
  if (error.code === "NO_DEPARTURES") {
    // Expected during off-peak - provide alternatives
  } else if (error.code === "STOP_NOT_FOUND") {
    // Help user find correct station name
  }
}
```

### Performance Expectations
- **Response time:** 300-1100ms typical
- **API calls:** 5-34 per query (more for complex routes)
- **Cache behavior:** Static data (stops, routes) cached for 12 hours
- **Real-time data:** Never cached, always fresh

### Rate Limiting
- Tools are optimized to minimize API calls
- Caching reduces load on PTV infrastructure
- No artificial rate limits, but be respectful of the public API

---

## 📝 Sample Agent Interactions

### Example 1: Simple Next Train Query
**User:** "When's the next train from Flinders Street to Richmond?"

**Agent Process:**
1. Call `next-train` with origin="Flinders Street", destination="Richmond"
2. Parse response for timing information  
3. Check for disruptions
4. Provide clear, contextual response

**Agent Response:** "The next train to Richmond is on the Glen Waverley line, departing from Platform 3 at 12:03 PM - that's right now! It's a direct service with no changes required."

### Example 2: Planning Ahead
**User:** "What trains run from Flinders Street to Mernda in the next hour?"

**Agent Process:**
1. Call `line-timetable` with stop="Flinders Street", route="Mernda", duration=60
2. Present multiple options
3. Highlight any service disruptions

**Agent Response:** "I found 3 Mernda line trains in the next hour:
- 12:09 PM from Platform 1 (6 minutes away)
- 12:29 PM from Platform 1 (26 minutes away)  
- 12:49 PM from Platform 1 (46 minutes away)

Please note: City Loop services are affected by maintenance work from 9 PM tonight."

### Example 3: Real-time Tracking
**User:** "How far away is my train? I'm at Flinders Street waiting for the Hurstbridge line."

**Agent Process:**
1. Call `how-far` with stop="Flinders Street", route="Hurstbridge"
2. Interpret real-time GPS data
3. Provide immediate, actionable information

**Agent Response:** "Great news! Your train is extremely close - just 40 meters away and will arrive in about 3 seconds. It's a 6-car Xtrapolis heading to Parliament. You should see it pulling into the platform right now!"

---

## 🎯 Success Metrics

A successful agent interaction with PTV tools should:

✅ **Provide clear timing** (Melbourne time + minutes until departure)  
✅ **Include platform information** when available  
✅ **Mention disruptions** that affect the user's journey  
✅ **Handle "no trains found" gracefully** with alternatives  
✅ **Use real-time data** when available for accuracy  
✅ **Avoid timezone confusion** by using display-friendly formats

---

## 🔍 Troubleshooting

### Tool Not Responding
- Check PTV API credentials are configured
- Verify MCP server is running
- Test with simple station names first

### Unexpected Results  
- Remember the 30-minute window limitation
- Check if it's outside normal service hours
- Verify station names are spelled correctly

### Performance Issues
- Most queries complete under 1 second
- Complex multi-route searches may take longer
- Cache warming improves subsequent requests

---

**Remember:** These tools provide real, live Melbourne train data. Treat the information as time-sensitive and always provide current context to users. The 30-minute window design ensures agents focus on immediately practical travel information rather than theoretical future schedules.
