'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { AgoraCall } from '@/components/organs/agora-call/agora-call';
import { CourseBreadcrumb } from '@/components/molecules/course-breadcrumb';
import { requestLiveSessionToken } from '@/lib/actions/agora/agora.action';
import type { AgoraCallConfig } from '@/components/organs/agora-call/agora-call.schema';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';
import { useDetailedEnrolledCourse } from '@/lib/hooks/course/useDetailedEnrolledCourse';
import { useSingleContentInEnrollment } from '@/lib/hooks/course/content/useContent';
import {
  ROUTE_STUDENT_COURSES,
  ROUTE_STUDENT_COURSE,
  ROUTE_STUDENT_COURSE_CONTENT,
} from '@/lib/data/constants/routes.constants';

interface LiveCallViewProps {
  enrollmentId: string;
  contentId: string;
}

export default function LiveCallView({ enrollmentId, contentId }: LiveCallViewProps) {
  const t = useTranslations('AgoraCall');
  const tCrumb = useTranslations('CourseBreadcrumb');
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const router = useRouter();
  const [config, setConfig] = useState<AgoraCallConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: detailed } = useDetailedEnrolledCourse(enrollmentId);
  const { data: contentData } = useSingleContentInEnrollment(enrollmentId, contentId);
  const courseName = detailed?.course.name;
  const contentTitle = contentData?.content.title;

  useEffect(() => {
    void (async () => {
      const result = await requestLiveSessionToken(contentId, enrollmentId);
      if (isNatsErrResult(result)) {
        setError(result.err.message);
        return;
      }
      setConfig({ ...result, sessionTitle: tRef.current('liveSessionTitle') });
    })();
  }, [contentId, enrollmentId]);

  const renewToken = async () => {
    const result = await requestLiveSessionToken(contentId, enrollmentId);
    if (isNatsErrResult(result)) throw new Error(result.err.message);
    return result.token;
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>{t('status.joining')}</span>
      </div>
    );
  }

  const handleBack = () => {
    router.push(ROUTE_STUDENT_COURSE_CONTENT(enrollmentId, contentId));
  };

  return (
    <div className="min-h-screen">
      {courseName && contentTitle ? (
        <div className="px-4 pt-4">
          <CourseBreadcrumb
            className="bg-background/80 rounded-md px-3 py-2 backdrop-blur"
            items={[
              { label: tCrumb('myCourses'), href: ROUTE_STUDENT_COURSES },
              { label: courseName, href: ROUTE_STUDENT_COURSE(enrollmentId) },
              { label: tCrumb('content') },
              {
                label: contentTitle,
                href: ROUTE_STUDENT_COURSE_CONTENT(enrollmentId, contentId),
              },
              { label: tCrumb('liveCall') },
            ]}
          />
        </div>
      ) : null}

      <AgoraCall
        config={config}
        renewToken={renewToken}
        onBack={handleBack}
        onCallEnded={handleBack}
      />
    </div>
  );
}
