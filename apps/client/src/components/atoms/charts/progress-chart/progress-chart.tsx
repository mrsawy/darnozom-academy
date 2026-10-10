'use client';

import { cn } from '@/lib/utils';
import type { ProgressChartProps } from './progress-chart.types';
import './progress-chart.css';

function pcn(element?: string): string {
  return element ? `progress-chart__${element}` : 'progress-chart';
}

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function ProgressChart({ data, percentages, colors, className = '' }: ProgressChartProps) {
  return (
    <div className={cn(pcn(), className)}>
      {data.map((label, index) => {
        const percentage = clampPercent(percentages[index] ?? 0);
        const color = colors[index % colors.length];

        return (
          <div key={index} className={pcn('item')}>
            <div className={pcn('label-container')}>
              <span className={pcn('label')}>{label}</span>
              <span className={pcn('percentage')}>{percentage}%</span>
            </div>
            <div className={cn(pcn('progress-container'), 'ltr')} dir="ltr" lang="en">
              <div
                className={pcn('track')}
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={label}>
                <div
                  className={pcn('fill')}
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
