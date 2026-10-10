import React from 'react';
import InstructorDetailsSection from './__sections/instructor-details';
import { getInstructor } from '@/lib/actions/instructors/getInstructors.action';
import { notFound } from 'next/navigation';

interface InstructorPageProps {
  params: Promise<{ instructorId: string }>;
}

const InstructorPage: React.FC<InstructorPageProps> = async ({ params }) => {
  const { instructorId } = await params;

  try {
    const instructor = await getInstructor(instructorId);

    if (!instructor) {
      notFound();
    }

    return <InstructorDetailsSection instructor={instructor} />;
  } catch {
    notFound();
  }
};

export default InstructorPage;
