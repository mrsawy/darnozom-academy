'use client';

import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { IEnrollment } from '@/lib/types/enrollment/enrollment.interface';
import { BookOpen, Compass, Filter, Search, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { EnrollmentCard } from './enrollment-card';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ROUTE_COURSES } from '@/lib/data/constants/routes.constants';

interface EnrollmentsProps {
  enrollments: IEnrollment[];
}

export default function Enrollments({ enrollments }: EnrollmentsProps) {
  const t = useTranslations('StudentCourses.page');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredEnrollments = enrollments;
  // .filter(enrollment => {
  //     const matchesSearch = enrollment.course?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false;
  //     const matchesFilter = filterStatus === "all" ||
  //         (filterStatus === "active" && enrollment.subscription?.status === SubscriptionStatus.ACTIVE) ||
  //         (filterStatus === "completed" && enrollment.progressPercentage === 100) ||
  //         (filterStatus === "in-progress" && enrollment.progressPercentage > 0 && enrollment.progressPercentage < 100);

  //     return matchesSearch && matchesFilter;
  // });

  const totalProgress =
    enrollments.reduce((sum, enrollment) => sum + enrollment.progressPercentage, 0) /
    enrollments.length;
  const completedCourses = enrollments.filter((e) => e.progressPercentage === 100).length;
  const totalTimeSpent = enrollments.reduce(
    (sum, enrollment) => sum + enrollment.timeSpentMinutes,
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('subtitle')}</p>
          </div>
          <Button asChild>
            <Link href={ROUTE_COURSES} className="flex items-center gap-2">
              <Compass className="h-4 w-4" />
              {t('browseCourses')}
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-lg border p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm">{t('stats.enrolledCourses')}</p>
                <p className="text-2xl font-bold">{enrollments.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm">{t('stats.averageProgress')}</p>
                <p className="text-2xl font-bold">{Math.round(totalProgress)}%</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm">{t('stats.completed')}</p>
                <p className="text-2xl font-bold">{completedCourses}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm">{t('stats.timeSpent')}</p>
                <p className="text-2xl font-bold">
                  {t('hoursShort', { hours: Math.floor(totalTimeSpent / 60) })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 rounded-lg border p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder={t('search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder={t('search.filterPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('search.allCourses')}</SelectItem>
                <SelectItem value="active">{t('search.activeSubscription')}</SelectItem>
                <SelectItem value="in-progress">{t('search.inProgress')}</SelectItem>
                <SelectItem value="completed">{t('search.completed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEnrollments.map((enrollment) => (
            <EnrollmentCard key={enrollment._id} enrollment={enrollment} />
          ))}
        </div>

        {filteredEnrollments.length === 0 && (
          <div className="py-12 text-center">
            <BookOpen className="text-muted-foreground/40 mx-auto mb-4 h-16 w-16" />
            <h3 className="mb-2 text-lg font-medium">{t('noCourses.title')}</h3>
            <p className="text-muted-foreground mb-6">{t('noCourses.description')}</p>
            <Button asChild>
              <Link href={ROUTE_COURSES} className="inline-flex items-center gap-2">
                <Compass className="h-4 w-4" />
                {t('browseCourses')}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
