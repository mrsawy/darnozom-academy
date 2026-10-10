'use client';

import { useTranslations } from 'next-intl';
import {
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useIsMobile } from '@/lib/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { DonutChartProps } from './donut-chart.types';
import './donut-chart.css';

function dcn(element?: string): string {
  return element ? `donut-chart__${element}` : 'donut-chart';
}

const DEFAULT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export function DonutChart({
  data,
  height = 320,
  mobileHeight = 350,
  className = '',
  colors = DEFAULT_COLORS,
  innerRadius = 60,
  outerRadius = 100,
  showLegend = false,
  centerTitle,
  centerValue,
}: DonutChartProps) {
  const t = useTranslations('Charts.donut');
  const isMobile = useIsMobile();

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const displayValue = centerValue ?? totalValue;

  const chartHeight = isMobile ? mobileHeight : height;

  return (
    <div
      className={cn(dcn(), className)}
      style={{
        height: `${chartHeight}px`,
        width: '100%',
        position: 'relative',
      }}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey="value"
            nameKey="type">
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}
            content={({ active, payload }) => {
              if (active && payload?.length) {
                const value = payload[0]?.value as number;
                const seriesName = payload[0]?.name as string;
                const lineColor = (payload[0]?.payload as { fill?: string })?.fill;
                const pct =
                  totalValue > 0 ? ((Number(value) / totalValue) * 100).toFixed(1) : '0.0';

                return (
                  <div className={dcn('tooltip')}>
                    <div className={dcn('tooltip-header')}>{t('tooltipTitle')}</div>

                    <div className={dcn('tooltip-content')}>
                      <div className={dcn('tooltip-label')}>
                        <span
                          className={dcn('tooltip-dot')}
                          style={{
                            width: 9,
                            height: 9,
                            backgroundColor: lineColor ?? 'var(--chart-1)',
                          }}
                        />
                        <span className={dcn('tooltip-series-name')}>{seriesName}</span>
                      </div>

                      <span className={dcn('tooltip-value')}>
                        {t('tooltipValueLine', {
                          percent: pct,
                          value: String(value ?? ''),
                        })}
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          {showLegend ? (
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              iconSize={66}
              wrapperStyle={{
                marginTop: '20px',
              }}
              width={0}
              content={(props) => {
                const { payload } = props;

                if (!payload?.length) {
                  return null;
                }

                const total = payload.reduce(
                  (sum: number, entry: { payload?: { value?: number } }) =>
                    sum + (entry.payload?.value ?? 0),
                  0
                );

                return (
                  <div className={dcn('legend-grid')}>
                    {payload.map(
                      (
                        entry: {
                          value?: string | number;
                          color?: string;
                          payload?: { value?: number };
                        },
                        index: number
                      ) => {
                        const value = entry.payload?.value ?? 0;
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

                        return (
                          <div key={`legend-item-${index}`} className={dcn('legend-item')}>
                            <span
                              className={dcn('legend-icon')}
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className={dcn('legend-text')}>
                              <span className={dcn('legend-text-value')}>{entry.value}</span>
                              <span className={dcn('legend-text-percentage')}>{percentage}%</span>
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>
                );
              }}
            />
          ) : null}
          {(Boolean(centerTitle) || centerValue !== undefined) && (
            <g>
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className={dcn('center-annotation')}>
                {centerTitle ? (
                  <>
                    <tspan
                      x="50%"
                      dy={isMobile ? '-65' : '-50'}
                      className={dcn('center-value-tspan')}>
                      {String(displayValue)}
                    </tspan>
                    <tspan x="50%" dy="24" className={dcn('center-label-tspan')}>
                      {centerTitle}
                    </tspan>
                  </>
                ) : (
                  <tspan x="50%" dy="0" className={dcn('center-value-tspan')}>
                    {String(displayValue)}
                  </tspan>
                )}
              </text>
            </g>
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
