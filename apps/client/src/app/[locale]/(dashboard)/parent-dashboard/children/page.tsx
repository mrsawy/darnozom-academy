'use client';

import { useState } from 'react';
import { ChildrenPageHeader } from './__components/children-page-header';
import { ChildrenTable } from './__components/children-table';
import { AddChildDialog } from './__components/add-child-dialog';
import { ChildGroups } from './__components/child-groups';
import { ChildSessions } from './__components/child-sessions';
import { useChildren } from '@/lib/hooks/parent/useParent.hook';
import { Alert, AlertDescription } from '@/components/atoms/alert';
import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

function ChildrenPage() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { data: children = [], isLoading } = useChildren();
  const t = useTranslations('ParentDashboard.children');

  return (
    <div className="container mx-auto px-4 py-6">
      <ChildrenPageHeader onAddChild={() => setAddDialogOpen(true)} />
      <Alert className="mb-6 border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
        <IconInfoCircle className="h-4 w-4 text-blue-600! dark:text-blue-400!" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          {t('passwordDisclaimer')}
        </AlertDescription>
      </Alert>
      <ChildrenTable items={children} isLoading={isLoading} />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {children.map((child) => (
          <div key={child._id} className="space-y-4">
            <ChildGroups childId={child._id} childName={`${child.firstName ?? ''}`} />
            <ChildSessions childId={child._id} childName={`${child.firstName ?? ''}`} />
          </div>
        ))}
      </div>
      <AddChildDialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} />
    </div>
  );
}

export default ChildrenPage;
