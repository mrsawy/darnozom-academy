import type { ChartConfig } from '@/components/atoms/chart';
import type { ReportsPieSlice } from '@darnozom/shared-types';

export type PieChartDatum = ReportsPieSlice & { fill: string };

export interface PieChartProps {
  data: ReportsPieSlice[];
  config: ChartConfig;
  className?: string;
  /** 0 = full pie; > 0 = donut (px). */
  innerRadius?: number;
  /** Recharts `nameKey` for labels in tooltip/legend. */
  nameKey?: 'key' | 'label';
}
