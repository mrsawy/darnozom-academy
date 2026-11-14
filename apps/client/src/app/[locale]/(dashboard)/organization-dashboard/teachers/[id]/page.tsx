'use client';

import { useParams } from 'next/navigation';
import { TeacherOverviewScreen } from './__components/teacher-overview-screen';

export default function TeacherPage() {
  const { id } = useParams<{ id: string }>();
  return <TeacherOverviewScreen teacherId={id} />;
}
