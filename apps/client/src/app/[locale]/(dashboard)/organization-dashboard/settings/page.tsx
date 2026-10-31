import { redirect } from 'next/navigation';
import { ROUTE_ORG_SETTINGS_PAYMENTS } from '@/lib/data/constants/routes.constants';

export default function SettingsPage() {
  redirect(ROUTE_ORG_SETTINGS_PAYMENTS);
}
