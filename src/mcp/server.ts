#!/usr/bin/env bun

import { NextTrainTool, nextTrainSchema } from '@/features/next_train/tool';
import { LineTimetableTool, lineTimetableSchema } from '@/features/line_timetable/tool';
import { HowFarTool, howFarSchema } from '@/features/how_far/tool';
import { validateRequiredAuth } from '@/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Validate credentials early
try {
  validateRequiredAuth();
} catch (error: any) {
  console.error('❌ Configuration error:', error.message);
  console.error('💡 Please set PTV_DEV_ID and PTV_API_KEY environment variables');
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

// Initialize tool instances
const nextTrain = new NextTrainTool();
const lineTimetable = new LineTimetableTool();
const howFar = new HowFarTool();

// Register handlers
server.setRequestHandler({ method: 'tools/list' } as any, async () => {
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

server.setRequestHandler({ method: 'tools/call' } as any, async (request: any) => {
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
