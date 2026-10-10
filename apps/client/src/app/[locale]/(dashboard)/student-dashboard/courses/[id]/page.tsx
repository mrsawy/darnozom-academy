import CourseView from '../__components/single-course-view';

interface SingleCourseEnrolledPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default async function SingleCourseEnrolledPage({ params }: SingleCourseEnrolledPageProps) {
  const enrollmentId = (await params).id;

  return (
    <div>
      <CourseView enrollmentId={enrollmentId} />
    </div>
  );
}
