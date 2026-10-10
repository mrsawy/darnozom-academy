'use client';

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { ActiveDotSvgProps, LineChartProps, LineChartRow } from './line-chart.types';
import './line-chart.css';

function lcn(element?: string): string {
  return element ? `line-chart__${element}` : 'line-chart';
}

const DEFAULT_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)'];

function rowValue(row: object, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

/** Safe for tooltip / axis labels (avoids String(object) => "[object Object]"). */
function tooltipDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  return '';
}

export function LineChart({
  data,
  xField = 'x',
  yField = 'y',
  seriesField,
  seriesLabels,
  height = 320,
  className = '',
  colors = DEFAULT_COLORS,
  smooth = true,
  showLegend = true,
  hideXAxisLabel = false,
  gridColor = 'var(--border)',
  gridDashArray = '0',
  showGrid = true,
  gridClassName,
  yAxisTickColor = 'var(--muted-foreground)',
}: LineChartProps) {
  const [dataItemState, setDataItemState] = useState<{
    name: string | undefined;
    hovering: boolean;
  }>({
    name: undefined,
    hovering: false,
  });

  const transformedData = useMemo(() => {
    if (!seriesField) {
      // Recharts expects a mutable array; props use `readonly` for caller convenience
      return [...data];
    }

    const uniqueXValues = [...new Set(data.map((item) => rowValue(item, xField)))] as (
      | string
      | number
    )[];
    const uniqueSeries = [...new Set(data.map((item) => rowValue(item, seriesField)))] as (
      | string
      | number
    )[];

    return uniqueXValues.map((xValue) => {
      const result: LineChartRow = { [xField]: xValue };
      for (const series of uniqueSeries) {
        const item = data.find(
          (d) => rowValue(d, xField) === xValue && rowValue(d, seriesField) === series
        );
        const yVal = item ? rowValue(item, yField) : undefined;
        result[String(series)] =
          yVal === null ||
          yVal === undefined ||
          typeof yVal === 'string' ||
          typeof yVal === 'number'
            ? yVal
            : undefined;
      }
      return result;
    });
  }, [data, xField, yField, seriesField]);

  const uniqueSeries = useMemo(() => {
    if (!seriesField) {
      return [] as (string | number)[];
    }
    return [...new Set(data.map((item) => rowValue(item, seriesField)))] as (string | number)[];
  }, [data, seriesField]);

  const { yAxisDomain, yAxisTicks } = useMemo(() => {
    if (!transformedData || transformedData.length === 0) {
      return {
        yAxisDomain: [0, 'auto'] as [number, 'auto'],
        yAxisTicks: undefined as number[] | undefined,
      };
    }

    let maxValue = 0;

    if (seriesField && uniqueSeries.length > 0) {
      for (const series of uniqueSeries) {
        const seriesMax = Math.max(
          ...transformedData.map((item) => Number(rowValue(item, String(series))) || 0)
        );
        maxValue = Math.max(maxValue, seriesMax);
      }
    } else {
      maxValue = Math.max(...transformedData.map((item) => Number(rowValue(item, yField)) || 0));
    }

    const padding = maxValue * 0.2;
    const maxWithPadding = maxValue + padding;
    const roundedMax = Math.ceil(maxWithPadding / 5) * 5;

    const ticks: number[] = [];
    for (let i = 0; i <= roundedMax; i += 5) {
      ticks.push(i);
    }

    return {
      yAxisDomain: [0, roundedMax] as [number, number],
      yAxisTicks: ticks,
    };
  }, [transformedData, seriesField, uniqueSeries, yField]) as {
    yAxisDomain: [number, number] | [number, 'auto'];
    yAxisTicks: number[] | undefined;
  };

  return (
    <div
      className={cn(lcn(), className)}
      style={{
        height: `${height}px`,
        width: '100%',
      }}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart
          data={transformedData}
          margin={{
            top: 5,
            bottom: 5,
          }}>
          {showGrid ? (
            <CartesianGrid
              className={gridClassName}
              strokeDasharray={gridDashArray}
              stroke={gridColor}
              vertical
              horizontal
            />
          ) : null}
          <XAxis dataKey={xField} hide={hideXAxisLabel} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: yAxisTickColor }}
            axisLine={false}
            tickLine={false}
            width={25}
            domain={yAxisDomain}
            ticks={yAxisTicks}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 'calc(var(--spacing) * 2)',
              boxShadow: 'var(--shadow-md)',
            }}
            shared={false}
            trigger="hover"
            content={(args) => {
              const { active, payload } = args;

              if (active && payload?.length) {
                let dataItem: (typeof payload)[0] | undefined;
                if (dataItemState.name && dataItemState.hovering) {
                  dataItem = payload.find(
                    (item) =>
                      String(item.dataKey ?? '') === dataItemState.name ||
                      item.name === dataItemState.name
                  );
                } else {
                  let maxItem = payload[0];
                  for (let i = 1; i < payload.length; i++) {
                    const item = payload[i];
                    if (Number(item.value) > Number(maxItem.value)) {
                      maxItem = item;
                    }
                  }
                  dataItem = maxItem;
                }

                const pl = dataItem?.payload as LineChartRow | undefined;
                const xValue = pl ? rowValue(pl, xField) : undefined;
                const value = dataItem?.value;
                const seriesName = dataItem?.name;
                const lineColor = dataItem?.color ?? dataItem?.stroke ?? 'var(--chart-1)';
                const xLabel = tooltipDisplayValue(xValue);

                return (
                  <div className={lcn('tooltip')}>
                    <div className={lcn('tooltip-content')}>
                      {seriesName ? (
                        <div className={lcn('tooltip-label')}>
                          <span
                            className={lcn('tooltip-indicator')}
                            style={{ backgroundColor: lineColor }}
                          />
                          <span className={lcn('tooltip-value')}>{tooltipDisplayValue(value)}</span>
                          <span className={lcn('tooltip-series')}>
                            {tooltipDisplayValue(seriesName)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <div className={lcn('tooltip-date-container')}>
                      {xLabel ? <span className={lcn('tooltip-date')}>{xLabel}</span> : null}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          {showLegend ? (
            <Legend
              verticalAlign="top"
              align="left"
              wrapperStyle={{ paddingBottom: '20px' }}
              iconType="circle"
              iconSize={6.4}
              formatter={(value) => <span className={lcn('legend-item-text')}>{value}</span>}
            />
          ) : null}
          {seriesField && uniqueSeries.length > 0 ? (
            uniqueSeries.map((series, index) => {
              const lineColor = colors[index % colors.length];
              const seriesKey = String(series);
              const displayName = seriesLabels?.[seriesKey] ?? seriesKey;

              return (
                <Line
                  key={seriesKey}
                  type={smooth ? 'monotone' : 'linear'}
                  dataKey={seriesKey}
                  name={displayName}
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={(props: ActiveDotSvgProps) => {
                    const { cx, cy, dataKey } = props;

                    return (
                      <g>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill="var(--card)"
                          stroke={lineColor}
                          strokeWidth={2}
                          onMouseEnter={() => {
                            setDataItemState({
                              name: dataKey as string,
                              hovering: true,
                            });
                          }}
                          onMouseMove={() => {
                            setDataItemState({
                              name: dataKey as string,
                              hovering: true,
                            });
                          }}
                          onMouseLeave={() => {
                            setDataItemState({
                              name: undefined,
                              hovering: false,
                            });
                          }}
                        />
                      </g>
                    );
                  }}
                  connectNulls
                />
              );
            })
          ) : (
            <Line
              type={smooth ? 'monotone' : 'linear'}
              dataKey={yField}
              stroke={colors[0]}
              strokeWidth={2}
              dot={false}
              activeDot={(props: ActiveDotSvgProps) => {
                const { cx, cy } = props;

                return (
                  <g>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="var(--card)"
                      stroke={colors[0]}
                      strokeWidth={2}
                      onMouseEnter={() => {
                        setDataItemState({
                          name: yField,
                          hovering: true,
                        });
                      }}
                      onMouseMove={() => {
                        setDataItemState({
                          name: yField,
                          hovering: true,
                        });
                      }}
                      onMouseLeave={() => {
                        setDataItemState({
                          name: undefined,
                          hovering: false,
                        });
                      }}
                    />
                  </g>
                );
              }}
              connectNulls
            />
          )}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
