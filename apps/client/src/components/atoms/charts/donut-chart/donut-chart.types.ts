export interface DonutChartDatum {
  type: string;
  value: number;
}

export interface DonutChartProps {
  data: DonutChartDatum[];
  height?: number;
  mobileHeight?: number;
  className?: string;
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  /** Reserved for future slice labels on the pie */
  showLabel?: boolean;
  showLegend?: boolean;
  centerTitle?: string;
  centerValue?: string | number;
}
