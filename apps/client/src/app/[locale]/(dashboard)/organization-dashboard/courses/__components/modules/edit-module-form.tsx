'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { updateModuleSchema, UpdateModuleSchema } from '@/lib/schema/module.schema';
import { updateModule } from '@/lib/actions/courses/modules.action';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs';
import { Plus, X, Save, Lightbulb } from 'lucide-react';
import { Checkbox } from '@/components/atoms/checkbox';
import { Label } from '@/components/atoms/label';
import { toast } from 'react-toastify';
import useGeneralStore from '@/lib/store/generalStore';
import { IModuleWithContents } from '@/lib/types/course/modules.interface';
import { useTranslations } from 'next-intl';
import ContentDataTable from '../tables/content-data-table';

interface EditModuleFormProps {
  module: IModuleWithContents;
  courseId: string;
  moduleId: string;
}

export default function EditModuleForm({ module, courseId, moduleId }: EditModuleFormProps) {
  const t = useTranslations('EditModuleForm');
  const [learningObjectives, setLearningObjectives] = useState<string[]>(
    module.learningObjectives ?? ['']
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: yupResolver(updateModuleSchema),
    defaultValues: {
      title: module.title ?? '',
      learningObjectives: module.learningObjectives ?? [''],
      description: module.description ?? '',
      settings: { discussionEnabled: module.settings?.discussionEnabled !== false },
    },
  });

  useEffect(() => {
    // Reset form values when module changes
    if (module) {
      reset({
        title: module.title ?? '',
        description: module.description ?? '',
        settings: { discussionEnabled: module.settings?.discussionEnabled !== false },
      });
      // Update learning objectives when module changes
      const objectives =
        module.learningObjectives && module.learningObjectives.length > 0
          ? module.learningObjectives
          : [''];
      setLearningObjectives(objectives);
    }
  }, [
    module,
    module?._id,
    module?.title,
    module?.description,
    module?.settings?.discussionEnabled,
    reset,
  ]);

  const onSubmit = async (values: UpdateModuleSchema) => {
    try {
      useGeneralStore.setState({ generalIsLoading: true });

      const filteredObjectives = learningObjectives.filter((obj) => obj && obj.trim() !== '');
      const moduleData = {
        ...values,
        learningObjectives: filteredObjectives,
      };

      await updateModule(moduleId, moduleData);
      toast.success(t('toast.moduleUpdated'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('toast.error');
      toast.error(errorMessage);
    } finally {
      useGeneralStore.setState({ generalIsLoading: false });
    }
  };

  const addObjective = () => {
    setLearningObjectives([...learningObjectives, '']);
  };

  const removeObjective = (index: number) => {
    if (learningObjectives.length > 1) {
      setLearningObjectives(learningObjectives.filter((_, i) => i !== index));
    }
  };

  const updateObjective = (index: number, value: string) => {
    const updated = [...learningObjectives];
    updated[index] = value;
    setLearningObjectives(updated);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="dir-ltr flex h-16 items-center">
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => {
                  void handleSubmit(onSubmit)();
                }}
                size="sm"
                className="">
                <Save className="mr-2 h-4 w-4" />
                {t('saveModule')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">{t('editModule')}</h1>
              <p className="mt-2">{t('buildEngagingModules')}</p>
            </div>

            <Tabs defaultValue="details" className="dir-unset w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">{t('tabs.details')}</TabsTrigger>
                <TabsTrigger value="content">{t('tabs.content')}</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('moduleInformation.title')}</CardTitle>
                    <CardDescription>{t('moduleInformation.description')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Module Title */}
                    <div className="space-y-2">
                      <span className="text-sm font-medium">
                        {t('moduleInformation.moduleTitle')}
                      </span>
                      <Input
                        id="module-title"
                        {...register('title')}
                        placeholder={t('moduleInformation.moduleTitlePlaceholder')}
                        className="w-full"
                      />
                      {errors.title ? (
                        <p className="text-sm text-red-600">{errors.title.message}</p>
                      ) : null}
                    </div>

                    {/* Module Description */}
                    <div className="space-y-2">
                      <span className="text-sm font-medium">
                        {t('moduleInformation.moduleDescription')}
                      </span>
                      <Textarea
                        id="module-description"
                        {...register('description')}
                        placeholder={t('moduleInformation.moduleDescriptionPlaceholder')}
                        rows={4}
                        className="w-full"
                      />
                      {errors.description ? (
                        <p className="text-sm text-red-600">{errors.description.message}</p>
                      ) : null}
                    </div>

                    <div className="flex items-start gap-3 rounded-md border p-3">
                      <Checkbox
                        id="edit-module-discussion"
                        checked={watch('settings.discussionEnabled') !== false}
                        onCheckedChange={(c) => {
                          setValue('settings.discussionEnabled', c === true, { shouldDirty: true });
                        }}
                      />
                      <div className="grid gap-1">
                        <Label
                          htmlFor="edit-module-discussion"
                          className="cursor-pointer text-sm font-medium">
                          {t('moduleInformation.discussionEnabled')}
                        </Label>
                        <p className="text-muted-foreground text-xs">
                          {t('moduleInformation.discussionEnabledHelp')}
                        </p>
                      </div>
                    </div>

                    {/* Learning Objectives */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {t('moduleInformation.learningObjectives')}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addObjective}
                          className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          {t('moduleInformation.addLearningObjective')}
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {learningObjectives.map((objective, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <Input
                              value={objective}
                              onChange={(e) => updateObjective(index, e.target.value)}
                              placeholder={t('moduleInformation.learningObjectivePlaceholder', {
                                index: index + 1,
                              })}
                              className="flex-1"
                            />
                            {learningObjectives.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeObjective(index)}
                                className="text-red-500 hover:text-red-700">
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="content">
                <ContentDataTable courseId={courseId} moduleId={moduleId} />
              </TabsContent>
            </Tabs>
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  void handleSubmit(onSubmit)();
                }}
                size="sm"
                className="m-6 mx-auto w-full max-w-32">
                <Save className="mr-2 h-4 w-4" />
                {t('saveModule')}
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Lightbulb className="mr-2 h-5 w-5 text-yellow-500" />
                  {t('sidebar.tips.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• {t('sidebar.tips.tip1')}</li>
                  <li>• {t('sidebar.tips.tip2')}</li>
                  <li>• {t('sidebar.tips.tip3')}</li>
                  <li>• {t('sidebar.tips.tip4')}</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
