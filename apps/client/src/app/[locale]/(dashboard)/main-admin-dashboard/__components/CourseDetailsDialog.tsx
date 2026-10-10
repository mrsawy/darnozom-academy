'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/atoms/dialog';
import { Badge } from '@/components/atoms/badge';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import type { PricingDetails } from '@/lib/types/course/course.interface';
import type { IReviewableCourse } from '@/lib/types/admin-review/admin-review.interface';
import { normalizeCourseSchoolTypes } from '@/lib/utils/course/normalize-course-school-types';

interface CourseDetailsDialogProps {
  course: IReviewableCourse | null;
  onClose: () => void;
}

const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  [BillingCycle.ONE_TIME]: 'One-Time',
  [BillingCycle.MONTHLY]: 'Monthly',
  [BillingCycle.YEARLY]: 'Yearly',
};

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b py-2 last:border-b-0">
      <span className="text-muted-foreground col-span-1 text-sm font-medium">{label}</span>
      <span className="col-span-2 text-sm wrap-break-word">{children}</span>
    </div>
  );
}

function PricingCard({ cycle, details }: { cycle: string; details: PricingDetails }) {
  const t = useTranslations('AdminDashboard');
  const hasDiscount =
    details.discountPercentage != null &&
    details.discountPercentage > 0 &&
    details.discountStartDate &&
    details.discountEndDate;

  const discountedPrice =
    hasDiscount && details.discountPercentage
      ? details.originalPrice * (1 - details.discountPercentage / 100)
      : null;

  return (
    <div className="space-y-1.5 rounded-md border p-3">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {BILLING_CYCLE_LABELS[cycle as BillingCycle] ?? cycle}
      </p>
      <div className="flex items-baseline gap-2">
        {discountedPrice == null ? (
          <span className="text-base font-bold">
            {details.originalPrice.toFixed(2)} {details.originalCurrency}
          </span>
        ) : (
          <>
            <span className="text-base font-bold">
              {discountedPrice.toFixed(2)} {details.originalCurrency}
            </span>
            <span className="text-muted-foreground text-sm line-through">
              {details.originalPrice.toFixed(2)} {details.originalCurrency}
            </span>
            <Badge variant="destructive" className="text-xs">
              -{details.discountPercentage}%
            </Badge>
          </>
        )}
      </div>
      {details.priceUSD != null && (
        <p className="text-muted-foreground text-xs">
          {t('courseDetails.approxUsd', { amount: details.priceUSD.toFixed(2) })}
        </p>
      )}
      {hasDiscount && details.discountStartDate && details.discountEndDate ? (
        <p className="text-muted-foreground text-xs">
          {t('courseDetails.discountRange', {
            from: new Date(details.discountStartDate).toLocaleDateString(),
            to: new Date(details.discountEndDate).toLocaleDateString(),
          })}
        </p>
      ) : null}
    </div>
  );
}

export function CourseDetailsDialog({ course, onClose }: CourseDetailsDialogProps) {
  const t = useTranslations('AdminDashboard');
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const gradeName = course?.grade ? (isArabic ? course.grade.nameAr : course.grade.nameEn) : null;
  const schoolTypeNames = course
    ? normalizeCourseSchoolTypes(course).schoolTypes.map((st) => (isArabic ? st.nameAr : st.nameEn))
    : [];

  return (
    <Dialog open={!!course} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('courseDetails.title', { name: course?.name ?? '' })}</DialogTitle>
        </DialogHeader>

        {course ? (
          <div className="space-y-0 divide-y rounded-lg border p-4">
            <DetailRow label={t('table.name')}>{course.name}</DetailRow>

            <DetailRow label={t('courseDetails.shortDescription')}>
              {course.shortDescription ?? (
                <span className="text-muted-foreground italic">{t('courseDetails.none')}</span>
              )}
            </DetailRow>

            <DetailRow label={t('table.description')}>
              {course.description ?? (
                <span className="text-muted-foreground italic">{t('courseDetails.none')}</span>
              )}
            </DetailRow>

            <DetailRow label={t('table.organization')}>
              {course.organization?.name ?? course.organizationId}
            </DetailRow>

            <DetailRow label={t('table.instructor')}>
              {course.instructor ? (
                `${course.instructor.firstName} ${course.instructor.lastName} (@${course.instructor.username})`
              ) : (
                <span className="text-muted-foreground italic">{t('courseDetails.none')}</span>
              )}
            </DetailRow>

            <DetailRow label={t('table.paid')}>
              <Badge variant={course.isPaid ? 'default' : 'secondary'}>
                {course.isPaid ? t('paidYes') : t('paidFree')}
              </Badge>
            </DetailRow>

            {course.isPaid && course.pricing && Object.keys(course.pricing).length > 0 ? (
              <div className="border-b py-3">
                <p className="text-muted-foreground mb-2 text-sm font-medium">
                  {t('courseDetails.pricing')}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(Object.entries(course.pricing) as [string, PricingDetails][]).map(
                    ([cycle, details]) =>
                      details ? <PricingCard key={cycle} cycle={cycle} details={details} /> : null
                  )}
                </div>
              </div>
            ) : null}

            <DetailRow label={t('courseDetails.categories')}>
              {course.categories && course.categories.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {course.categories.map((cat) => (
                    <Badge key={cat._id} variant="outline">
                      {cat.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground italic">
                  {t('courseDetails.noCategories')}
                </span>
              )}
            </DetailRow>

            <DetailRow label={t('courseDetails.grade')}>
              {gradeName ? (
                <Badge variant="outline">{gradeName}</Badge>
              ) : (
                <span className="text-muted-foreground italic">{t('courseDetails.none')}</span>
              )}
            </DetailRow>

            <DetailRow label={t('courseDetails.schoolType')}>
              {schoolTypeNames.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {schoolTypeNames.map((name) => (
                    <Badge key={name} variant="outline">
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground italic">{t('courseDetails.none')}</span>
              )}
            </DetailRow>

            <DetailRow label={t('table.status')}>
              <ApprovalStatusBadge status={course.approvalStatus} />
            </DetailRow>

            {course.approvalComment ? (
              <DetailRow label={t('courseDetails.approvalComment')}>
                {course.approvalComment}
              </DetailRow>
            ) : null}

            {course.reviewedAt ? (
              <DetailRow label={t('courseDetails.reviewedAt')}>
                {new Date(course.reviewedAt).toLocaleString()}
              </DetailRow>
            ) : null}

            <DetailRow label={t('table.created')}>
              {new Date(course.createdAt).toLocaleString()}
            </DetailRow>

            <DetailRow label={t('courseDetails.updatedAt')}>
              {new Date(course.updatedAt).toLocaleString()}
            </DetailRow>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
