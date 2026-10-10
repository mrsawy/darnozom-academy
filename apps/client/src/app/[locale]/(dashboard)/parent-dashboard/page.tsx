import { getRelatedStudentsProgress } from '@/lib/actions/parent/parent-progress.action';
import { ParentDashboardView } from './__components/parent-dashboard-view';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';

export default async function ParentDashboardPage() {
  const progressResult = await getRelatedStudentsProgress();
  const initialChildrenProgress = isNatsErrResult(progressResult) ? [] : progressResult;
  return <ParentDashboardView initialChildrenProgress={initialChildrenProgress} />;
}
