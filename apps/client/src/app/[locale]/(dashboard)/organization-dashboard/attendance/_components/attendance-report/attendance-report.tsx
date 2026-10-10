'use client';

import { useState } from 'react';
import { useMutation, cn } from '@/lib/utils';
import { ICourse } from '@/lib/types/course/course.interface';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { Button } from '@/components/atoms/button';
import { Calendar } from '@/components/atoms/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/popover';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import { toast } from 'react-toastify';
import { generateAttendanceReport } from '@/lib/actions/attendance/generateReport.action';
import { Badge } from '@/components/atoms/badge';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Progress } from '@/components/atoms/progress';
import { useTranslations, useLocale } from 'next-intl';

interface AttendanceReportProps {
  courses: ICourse[];
}

interface ReportData {
  summary: {
    totalStudents: number;
    totalSessions: number;
    totalPresent: number;
    totalLate: number;
    totalExcused: number;
    totalAbsent: number;
  };
  students: {
    studentId: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
    expectedSessions: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    attendanceRate: number;
  }[];
}

export function AttendanceReport({ courses }: AttendanceReportProps) {
  const t = useTranslations('AttendanceReport');
  const locale = useLocale();
  const dateFnsLocale = locale === 'ar' ? ar : enUS;
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const reportMutation = useMutation({
    mutationFn: async () => {
      const result = await generateAttendanceReport({
        courseId: selectedCourseId,
        startDate,
        endDate,
      });
      if (result && typeof result === 'object' && 'err' in result) {
        throw new Error((result as { err: { message: string } }).err.message);
      }
      return result as ReportData;
    },
    onSuccess: (data) => {
      setReportData(data);
      toast.success(t('reportGenerated'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('failedToGenerate'));
    },
  });

  const handleGenerateReport = () => {
    if (!selectedCourseId) {
      toast.error(t('pleaseSelectCourse'));
      return;
    }
    reportMutation.mutate();
  };

  const selectedCourse = courses.find((c) => c._id === selectedCourseId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <span className="text-sm font-medium">{t('selectCourse')}</span>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectCoursePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course._id} value={course._id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">{t('startDate')}</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, 'PPP', { locale: dateFnsLocale })
                    ) : (
                      <span>{t('pickDate')}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">{t('endDate')}</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      format(endDate, 'PPP', { locale: dateFnsLocale })
                    ) : (
                      <span>{t('pickDate')}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleGenerateReport}
            disabled={reportMutation.isPending || !selectedCourseId}>
            {reportMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('generateReport')}
          </Button>
        </CardContent>
      </Card>

      {reportData ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {t('attendanceReport', { courseName: selectedCourse?.name ?? '' })}
                </CardTitle>
                <CardDescription>
                  {startDate && endDate
                    ? `${format(startDate, 'PPP', { locale: dateFnsLocale })} - ${format(endDate, 'PPP', { locale: dateFnsLocale })}`
                    : t('allTime')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {reportData.students && reportData.students.length > 0 ? (
              <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{reportData.summary.totalStudents}</div>
                    <p className="text-muted-foreground text-xs">{t('totalStudents')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{reportData.summary.totalSessions}</div>
                    <p className="text-muted-foreground text-xs">{t('totalSessions')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {reportData.summary.totalPresent}
                    </div>
                    <p className="text-muted-foreground text-xs">{t('present')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">
                      {reportData.summary.totalAbsent}
                    </div>
                    <p className="text-muted-foreground text-xs">{t('absent')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-600">
                      {reportData.summary.totalLate}
                    </div>
                    <p className="text-muted-foreground text-xs">{t('late')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">
                      {reportData.summary.totalExcused}
                    </div>
                    <p className="text-muted-foreground text-xs">{t('excused')}</p>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('student')}</TableHead>
                    <TableHead>{t('email')}</TableHead>
                    <TableHead>{t('expectedSessions')}</TableHead>
                    <TableHead>{t('present')}</TableHead>
                    <TableHead>{t('absent')}</TableHead>
                    <TableHead>{t('late')}</TableHead>
                    <TableHead>{t('excused')}</TableHead>
                    <TableHead>{t('attendanceRate')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!reportData.students || reportData.students.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                        {t('noAttendanceData')}
                      </TableCell>
                    </TableRow>
                  )}
                  {reportData.students?.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {student.avatar ? (
                            <Image
                              src={student.avatar}
                              alt={`${student.firstName} ${student.lastName}`}
                              width={32}
                              height={32}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : null}
                          <span>
                            {student.firstName} {student.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {student.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.expectedSessions}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{student.presentCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive" title={t('absentDerived')}>
                          {student.absentCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{student.lateCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.excusedCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={student.attendanceRate || 0}
                            className={cn(
                              'w-24',
                              student.attendanceRate >= 75
                                ? '*:bg-green-600'
                                : student.attendanceRate >= 50
                                  ? '*:bg-yellow-600'
                                  : '*:bg-red-600'
                            )}
                          />
                          <span className="min-w-[45px] text-sm font-medium">
                            {student.attendanceRate?.toFixed(1) || 0}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
