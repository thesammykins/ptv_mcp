import { PtvClient } from '@/ptv/client';

export interface LineTimetableInput {
  stop: string | number;
  route: string | number;
  direction?: string | number;
  time?: string; // ISO
}

export interface LineTimetableOutputItem {
  scheduled: string;
  estimated?: string | null;
  platform?: string | null;
  headsign?: string;
}

export const lineTimetableSchema = {
  type: 'object',
  required: ['stop', 'route'],
  properties: {
    stop: { description: 'Stop name or ID', anyOf: [{ type: 'string' }, { type: 'number' }] },
    route: { description: 'Route name or ID', anyOf: [{ type: 'string' }, { type: 'number' }] },
    direction: { description: 'Direction name or ID', anyOf: [{ type: 'string' }, { type: 'number' }] },
    time: { type: 'string', format: 'date-time' },
  },
} as const;

export class LineTimetableTool {
  constructor(private client = new PtvClient()) {}

  async execute(input: LineTimetableInput): Promise<{ data: { items: LineTimetableOutputItem[] } }> {
    // TODO: implement orchestration
    console.log('LineTimetable input:', input);
    console.log('Client available:', this.client ? 'yes' : 'no');
    return { data: { items: [] } };
  }
}
