import { IInstructor } from '@/lib/types/user/user.interface';
import InstructorProfileHeader from '../__components/instructor-profile-header';
import InstructorBio from '../__components/instructor-bio';
import InstructorStats from '../__components/instructor-stats';
import InstructorCourses from '../__components/instructor-courses';
import { InstructorPrivateSessions } from '../__components/instructor-private-sessions';

interface Props {
  instructor: IInstructor;
}

function InstructorDetailsSection({ instructor }: Props) {
  return (
    <div className="bg-background min-h-screen">
      <InstructorProfileHeader instructor={instructor} />

      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Main Content Column */}
          <div className="space-y-6 lg:col-span-2 lg:space-y-8">
            <InstructorBio instructor={instructor} />
            <InstructorCourses instructor={instructor} />
            <InstructorPrivateSessions instructorId={instructor._id} />
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6 lg:space-y-8">
            <InstructorStats instructor={instructor} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstructorDetailsSection;
