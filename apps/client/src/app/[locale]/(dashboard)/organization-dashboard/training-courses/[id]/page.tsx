'use client';

import { useParams } from 'next/navigation';
import { TrainingCourseDetail } from './__components/training-course-detail';

export default function TrainingCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <TrainingCourseDetail courseId={id} />;
}
