'use client';

import { useParams } from 'next/navigation';
import { SessionCallView } from '@/components/organs/academics/session-call-view';
import { ROUTE_ORG_SESSION } from '@/lib/data/constants/routes.constants';

export default function OrgSessionCallPage() {
  const { id } = useParams<{ id: string }>();
  return <SessionCallView sessionId={id} backHref={ROUTE_ORG_SESSION(id)} />;
}
