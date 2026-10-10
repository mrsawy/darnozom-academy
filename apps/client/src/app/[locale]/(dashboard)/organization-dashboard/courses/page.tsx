import CourseDataTable from './__components/tables/course-data-table';
import CoursesHierarchyDisclaimer from './__components/course/courses-hierarchy-disclaimer/courses-hierarchy-disclaimer';

export default async function CoursePage() {
  return (
    <div className="p-4">
      <CoursesHierarchyDisclaimer />
      <CourseDataTable />
    </div>
  );
}
