/** Row shape: arbitrary keys for x, y, and optional series dimension */
export type LineChartRow = Record<string, string | number | undefined | null>;

export interface LineChartProps {
  /** Row objects (domain DTOs OK); chart reads keys from xField / yField / seriesField */
  data: readonly object[];
  xField?: string;
  yField?: string;
  /** When set, data is pivoted so each series becomes a column keyed by series value */
  seriesField?: string;
  /** Legend / tooltip names when `seriesField` keys are opaque (e.g. course ids) */
  seriesLabels?: Record<string, string>;
  height?: number;
  className?: string;
  colors?: string[];
  smooth?: boolean;
  showLegend?: boolean;
  hideXAxisLabel?: boolean;
  gridColor?: string;
  gridDashArray?: string;
  showGrid?: boolean;
  gridClassName?: string;
  yAxisTickColor?: string;
}

export interface ActiveDotSvgProps {
  cx?: number;
  cy?: number;
  dataKey?: string | number;
}
