// next_train tool scaffolding
import { PtvClient } from '@/ptv/client';

export interface NextTrainInput {
  origin: string;
  destination: string;
  time?: string; // ISO 8601
}

export interface NextTrainOutput {
  route?: { id?: number; name?: string };
  direction?: { id?: number; name?: string };
  departure?: {
    scheduled: string;
    estimated?: string | null;
    platform?: string | null;
    runRef?: string;
  };
  disruptions?: string[];
}

export const nextTrainSchema = {
  type: 'object',
  required: ['origin', 'destination'],
  properties: {
    origin: { type: 'string', description: 'Origin station name or ID' },
    destination: { type: 'string', description: 'Destination station name or ID' },
    time: { type: 'string', format: 'date-time', description: 'Departure time (ISO 8601, defaults to now)' },
  },
} as const;

export class NextTrainTool {
  constructor(private client = new PtvClient()) {}

  async execute(input: NextTrainInput): Promise<{ data: NextTrainOutput; metadata?: Record<string, unknown> }> {
    // Placeholder implementation; full orchestration to be added
    const started = Date.now();
    // TODO: implement stop resolution, route/direction, departures, validation
    console.log('NextTrain input:', input);
    console.log('Client available:', this.client ? 'yes' : 'no');
    return {
      data: {},
      metadata: { executionTime: Date.now() - started, cacheHit: false, apiCalls: 0, dataFreshness: 'unknown' },
    };
  }
}
