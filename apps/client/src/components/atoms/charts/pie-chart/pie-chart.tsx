'use client';

import * as React from 'react';
import { Cell, Pie, PieChart as RechartsPie } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/atoms/chart';
import { cn } from '@/lib/utils';
import type { PieChartDatum, PieChartProps } from './pie-chart.types';

const CHART_COLOR_VARS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
] as const;

function mapSlicesToData(config: ChartConfig, slices: PieChartProps['data']): PieChartDatum[] {
  return slices.map((slice, i) => {
    const fromConfig = config[slice.key]?.color;
    const fill =
      typeof fromConfig === 'string'
        ? fromConfig
        : (CHART_COLOR_VARS[i % CHART_COLOR_VARS.length] ?? CHART_COLOR_VARS[0]);
    return { ...slice, fill };
  });
}

/**
 * Themed pie / donut chart on top of {@link ChartContainer} and Recharts.
 */
export function PieChart({
  data,
  config,
  className,
  innerRadius = 0,
  nameKey = 'label',
}: PieChartProps) {
  const chartData = React.useMemo(() => mapSlicesToData(config, data), [config, data]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <ChartContainer
      config={config}
      className={cn('mx-auto aspect-square max-h-[280px] w-full', className)}>
      <RechartsPie>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey={nameKey}
          innerRadius={innerRadius}
          strokeWidth={2}>
          {chartData.map((entry) => (
            <Cell key={entry.key} fill={entry.fill} />
          ))}
        </Pie>
      </RechartsPie>
    </ChartContainer>
  );
}
