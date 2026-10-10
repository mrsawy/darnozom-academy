import { redirect } from 'next/navigation';
import { ROUTE_ORG_VERIFICATION_EMAIL } from '@/lib/data/constants/routes.constants';

export default function VerificationPage() {
  redirect(ROUTE_ORG_VERIFICATION_EMAIL);
}
