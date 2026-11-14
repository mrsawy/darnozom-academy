'use client';

import { useParams } from 'next/navigation';
import { SessionCallView } from '@/components/organs/academics/session-call-view';
import { ROUTE_STUDENT_MY_GROUPS } from '@/lib/data/constants/routes.constants';

export default function StudentSessionCallPage() {
  const { id } = useParams<{ id: string }>();
  return <SessionCallView sessionId={id} backHref={ROUTE_STUDENT_MY_GROUPS} />;
}
