import { PtvClient } from '@/ptv/client';

export interface HowFarInput {
  stop: string | number;
  route: string | number;
  direction?: string | number;
}

export interface HowFarOutput {
  distanceMeters?: number;
  etaSeconds?: number;
  vehicleRunRef?: string;
}

export const howFarSchema = {
  type: 'object',
  required: ['stop', 'route'],
  properties: {
    stop: { anyOf: [{ type: 'string' }, { type: 'number' }] },
    route: { anyOf: [{ type: 'string' }, { type: 'number' }] },
    direction: { anyOf: [{ type: 'string' }, { type: 'number' }] },
  },
} as const;

export class HowFarTool {
  constructor(private client = new PtvClient()) {}

  async execute(input: HowFarInput): Promise<{ data: HowFarOutput }> {
    // TODO: implement with vehicle positions if available; fallback to timetable estimate
    console.log('HowFar input:', input);
    console.log('Client available:', this.client ? 'yes' : 'no');
    return { data: {} };
  }
}
