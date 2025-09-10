#!/usr/bin/env bun

import { NextTrainTool, nextTrainSchema } from '../features/next_train/tool';
import { LineTimetableTool, lineTimetableSchema } from '../features/line_timetable/tool';
import { HowFarTool, howFarSchema } from '../features/how_far/tool';
import { PtvClient } from '../ptv/client';
import { config } from '../config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Validate credentials early
if (!config.ptvDevId || !config.ptvApiKey) {
  console.error('❌ Configuration error: PTV_DEV_ID and PTV_API_KEY must be set');
  console.error('💡 Please set PTV_DEV_ID and PTV_API_KEY environment variables');
  console.error('📋 Copy .env.example to .env and add your credentials');
  process.exit(1);
}

const server = new Server(
  {
    name: 'ptv-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize PTV client
const ptvClient = new PtvClient();

// Initialize tool instances
const nextTrain = new NextTrainTool(ptvClient);
const lineTimetable = new LineTimetableTool(ptvClient);
const howFar = new HowFarTool(ptvClient);

// Register handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'next-train',
        description: 'Find the next train between origin and destination stops',
        inputSchema: nextTrainSchema,
      },
      {
        name: 'line-timetable', 
        description: 'Get timetable for a specific stop and route',
        inputSchema: lineTimetableSchema,
      },
      {
        name: 'how-far',
        description: 'Estimate distance and ETA for the nearest approaching train',
        inputSchema: howFarSchema,
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'next-train':
        return { content: [{ type: 'text', text: JSON.stringify(await nextTrain.execute(args), null, 2) }] };
      case 'line-timetable':
        return { content: [{ type: 'text', text: JSON.stringify(await lineTimetable.execute(args), null, 2) }] };
      case 'how-far':
        return { content: [{ type: 'text', text: JSON.stringify(await howFar.execute(args), null, 2) }] };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{ 
        type: 'text', 
        text: JSON.stringify({ 
          error: {
            code: error.code || 'TOOL_ERROR',
            message: error.message,
            ...(error.status && { status: error.status })
          }
        }, null, 2)
      }],
      isError: true,
    };
  }
});

// Start the server
const transport = new StdioServerTransport();
server.connect(transport);

console.error('🚂 PTV MCP Server started');
console.error('📡 Connected to PTV API:', config.ptvBaseUrl);
console.error('🔧 Tools available: next-train, line-timetable, how-far');
console.error('💡 Ready for Claude Desktop integration');
