import {
  BarChart3,
  ClipboardCheck,
  Cloud,
  MessageSquare,
  Palette,
  Shield,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export type HeroFeatureLabelKey =
  | 'cloudBased'
  | 'mobileReady'
  | 'analytics'
  | 'secure'
  | 'multiTenant'
  | 'fast'
  | 'aiPowered'
  | 'richContent'
  | 'assessments'
  | 'collaboration'
  | 'progressTracking'
  | 'customBranding';

export const HERO_FEATURE_ICONS: { Icon: LucideIcon; labelKey: HeroFeatureLabelKey }[] = [
  { Icon: Cloud, labelKey: 'cloudBased' },
  { Icon: Smartphone, labelKey: 'mobileReady' },
  { Icon: BarChart3, labelKey: 'analytics' },
  { Icon: Shield, labelKey: 'secure' },
  { Icon: Users, labelKey: 'multiTenant' },
  { Icon: Zap, labelKey: 'fast' },
  { Icon: Sparkles, labelKey: 'aiPowered' },
  { Icon: Video, labelKey: 'richContent' },
  { Icon: ClipboardCheck, labelKey: 'assessments' },
  { Icon: MessageSquare, labelKey: 'collaboration' },
  { Icon: TrendingUp, labelKey: 'progressTracking' },
  { Icon: Palette, labelKey: 'customBranding' },
];
