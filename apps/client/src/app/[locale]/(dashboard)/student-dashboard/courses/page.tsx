import { PaginationOptions } from '@/lib/types/Paginated';
import { StudentCoursesWithData } from './__components/student-courses-with-data';

interface CoursesPageProps {
  searchParams: Promise<PaginationOptions>;
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const paginationOptions = await searchParams;

  return (
    <div>
      <StudentCoursesWithData paginationOptions={paginationOptions} />
    </div>
  );
}
