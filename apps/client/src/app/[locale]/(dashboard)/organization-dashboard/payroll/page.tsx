'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PayStatementStatus } from '@darnozom/shared-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import {
  useApprovePayStatement,
  useGeneratePayStatements,
  usePayProfiles,
  usePayStatements,
} from '@/lib/hooks/payroll/use-payroll.hook';
import { PayProfilesTable } from '@/components/organs/payroll/pay-profiles-table';
import { PayProfileDialog } from '@/components/organs/payroll/pay-profile-dialog';
import { PayStatementsTable } from '@/components/organs/payroll/pay-statements-table';
import { AddBonusDialog } from '@/components/organs/payroll/add-bonus-dialog';
import { MarkPaidDialog } from '@/components/organs/payroll/mark-paid-dialog';
import type { IPayStatement, ITeacherPayProfile } from '@/lib/types/payroll/payroll';

export default function AccountantPayrollPage() {
  const t = useTranslations('Payroll');

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Statements query
  const query = {
    month: selectedMonth || undefined,
    status: selectedStatus === 'ALL' ? undefined : (selectedStatus as PayStatementStatus),
  };
  const { data: statements, isLoading: isLoadingStatements } = usePayStatements(query);
  const generateStatements = useGeneratePayStatements();
  const approveStatement = useApprovePayStatement();

  // Profiles query
  const { data: profiles, isLoading: isLoadingProfiles } = usePayProfiles();

  // Dialog state
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ITeacherPayProfile | null>(null);

  const [bonusStatement, setBonusStatement] = useState<IPayStatement | null>(null);
  const [paidStatement, setPaidStatement] = useState<IPayStatement | null>(null);

  const handleEditProfile = (profile: ITeacherPayProfile) => {
    setEditingProfile(profile);
    setProfileDialogOpen(true);
  };

  const handleCreateProfile = () => {
    setEditingProfile(null);
    setProfileDialogOpen(true);
  };

  const handleGenerate = () => {
    if (!selectedMonth) return;
    generateStatements.mutate(selectedMonth);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </div>

      <Tabs defaultValue="statements" className="space-y-6">
        <TabsList>
          <TabsTrigger value="statements">{t('title')}</TabsTrigger>
          <TabsTrigger value="profiles">{t('teachers')}</TabsTrigger>
        </TabsList>

        <TabsContent value="statements" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-lg border shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('month')}:</span>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-40"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('status')}:</span>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    {Object.values(PayStatementStatus).map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`statuses.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generateStatements.isPending || !selectedMonth}
            >
              {t('generateStatements')}
            </Button>
          </div>

          <PayStatementsTable
            statements={statements ?? []}
            isLoading={isLoadingStatements}
            onAddBonus={(s) => setBonusStatement(s)}
            onApprove={(id) => approveStatement.mutate(id)}
            onMarkPaid={(s) => setPaidStatement(s)}
          />
        </TabsContent>

        <TabsContent value="profiles" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleCreateProfile}>
              {t('addProfile')}
            </Button>
          </div>

          <PayProfilesTable
            profiles={profiles ?? []}
            isLoading={isLoadingProfiles}
            onEditProfile={handleEditProfile}
          />
        </TabsContent>
      </Tabs>

      <PayProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        profile={editingProfile}
      />

      <AddBonusDialog
        open={Boolean(bonusStatement)}
        onOpenChange={(open) => !open && setBonusStatement(null)}
        statement={bonusStatement}
      />

      <MarkPaidDialog
        open={Boolean(paidStatement)}
        onOpenChange={(open) => !open && setPaidStatement(null)}
        statement={paidStatement}
      />
    </div>
  );
}
