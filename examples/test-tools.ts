#!/usr/bin/env bun

/*
  Example script to test PTV MCP tools locally (for development)
  Requires PTV_DEV_ID and PTV_API_KEY environment variables.
*/

import { NextTrainTool } from '@/features/next_train/tool';
import { LineTimetableTool } from '@/features/line_timetable/tool';
import { HowFarTool } from '@/features/how_far/tool';

async function main() {
  console.log('🚂 PTV MCP Tool Testing\n');

  const nextTrain = new NextTrainTool();
  const lineTimetable = new LineTimetableTool();
  const howFar = new HowFarTool();

  try {
    console.log('Testing next-train tool...');
    const result1 = await nextTrain.execute({
      origin: 'Flinders Street',
      destination: 'South Morang',
    });
    console.log('Result:', JSON.stringify(result1, null, 2));
    console.log('');

    console.log('Testing line-timetable tool...');
    const result2 = await lineTimetable.execute({
      stop: 'Flinders Street',
      route: 'Hurstbridge',
    });
    console.log('Result:', JSON.stringify(result2, null, 2));
    console.log('');

    console.log('Testing how-far tool...');
    const result3 = await howFar.execute({
      stop: 'South Morang',
      route: 'Hurstbridge',
    });
    console.log('Result:', JSON.stringify(result3, null, 2));
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    if (error.status) console.error('Status:', error.status);
  }
}

main().catch(console.error);
