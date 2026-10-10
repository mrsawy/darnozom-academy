'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { CheckCircle } from 'lucide-react';
import { ICourseOverview } from '@/lib/types/course/course.interface';
import SingleCourseHeader from '../__components/single-course-header';
import InstructorCard from '../__components/instructor-card';
import CourseContent from '../__components/course-content';
import SingleCourseOverView from '../__components/single-course-overview';
import { IUser } from '@/lib/types/user/user.interface';
import { useTranslations } from 'next-intl';
import { CourseReviewsSection } from '../__components/course-reviews-section';

function SingleCourse({ course, user }: { course: ICourseOverview; user?: IUser }) {
  const t = useTranslations('Courses.singleCourse');

  return (
    <div className="bg-background min-h-screen">
      {/* Navigation */}
      {/* <BreadCrumb /> */}

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="order-2 space-y-8 lg:order-1 lg:col-span-2">
            {/* Course Header */}
            <SingleCourseHeader course={course} />

            {/* Instructor */}
            <InstructorCard course={course} />

            {/* What You'll Learn */}
            {course.learningObjectives.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('whatYoullLearn')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {course.learningObjectives.map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="text-primary mt-0.5 h-5 w-5 shrink-0" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Course Content */}

            <CourseContent course={course} />
            <CourseReviewsSection courseId={course._id} />
          </div>

          {/* Sidebar */}
          <div className="order-1 space-y-6 lg:order-2">
            {/* Course Preview Card */}
            <SingleCourseOverView course={course} user={user} />{' '}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SingleCourse;
