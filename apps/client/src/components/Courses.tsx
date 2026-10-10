'use client';
import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { CourseCard } from '@/components/CourseCard';
import { courses, categories } from '@/data/courses';
import { useTranslations } from 'next-intl';
function Courses() {
  const t = useTranslations('CoursesListing');
  const [searchTerm] = useState('');
  const [selectedCategory] = useState('all');
  return (
    <div className="bg-background min-h-screen">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Results Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-2xl font-bold">
              {selectedCategory === 'all'
                ? t('allCourses')
                : categories.find((c) => c.id === selectedCategory)?.name}
            </h2>
            <p className="text-muted-foreground">
              {t('coursesFound', { count: courses.length })}
              {searchTerm ? t('forSearchTerm', { term: searchTerm }) : null}
            </p>
          </div>
        </div>

        {/* Course Grid */}
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="bg-primary/10 mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full">
              <BookOpen className="text-primary h-12 w-12" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">{t('noCoursesFound')}</h3>
            <p className="text-muted-foreground mb-6">{t('tryAdjusting')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Courses;
