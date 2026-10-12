'use client';

import { useParams } from 'next/navigation';
import { SessionDetailScreen } from './__components/session-detail-screen';

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  return <SessionDetailScreen sessionId={id} />;
}
