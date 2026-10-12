'use client';

import { useParams } from 'next/navigation';
import { ProgramDetail } from './__components/program-detail';

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <ProgramDetail programId={id} />;
}
