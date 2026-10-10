import CourseForm from '../__components/course-form';
import CreateCourseInstructorRequiredModal from '../__components/course/create-course-instructor-required-modal';

export default async function CreateCoursePage() {
  return (
    <div className="flex flex-1 flex-col p-5">
      <CreateCourseInstructorRequiredModal />
      <CourseForm mode="create" />
    </div>
  );
}
