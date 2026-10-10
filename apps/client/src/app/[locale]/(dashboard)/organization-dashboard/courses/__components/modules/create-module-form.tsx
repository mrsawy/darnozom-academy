import { DialogFooter } from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Checkbox } from '@/components/atoms/checkbox';
import { useForm } from 'react-hook-form';
import { createModuleSchema, type CreateModuleSchema } from '@/lib/schema/module.schema';
import { yupResolver } from '@hookform/resolvers/yup';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useCreateModule } from '@/lib/hooks/course/useModules';
import { useTranslations } from 'next-intl';

function CreateModuleForm({
  courseId,
  setOpen,
}: {
  courseId: string;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const t = useTranslations('CreateModuleForm');
  const [learningObjectives, setLearningObjectives] = useState<string[]>(['']);
  const createModuleMutation = useCreateModule();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(createModuleSchema),
    defaultValues: {
      title: '',
      description: '',
      settings: { discussionEnabled: true },
    },
  });

  async function onCreateModule(values: CreateModuleSchema) {
    const filteredObjectives = learningObjectives.filter((obj) => obj && obj.trim() !== '');
    const moduleData = {
      ...values,
      learningObjectives: filteredObjectives,
    };

    createModuleMutation.mutate(
      { courseId, moduleData },
      {
        onSuccess: () => {
          // The handleDataChange will be handled by the parent component's useEffect
          reset();
          setLearningObjectives(['']);
          setOpen(false);
        },
      }
    );
  }

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
    <div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          void handleSubmit(onCreateModule)(e);
        }}>
        <div className="space-y-1">
          <Label htmlFor="create-title" className="text-sm">
            {t('title')}
          </Label>
          <Input id="create-title" {...register('title', { required: t('titleRequired') })} />
          {errors.title ? (
            <p className="text-left text-sm text-red-400">{errors.title?.message}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="create-description" className="text-sm">
            {t('description')}
          </Label>
          <Input id="create-description" {...register('description')} />
          {errors.description ? (
            <p className="text-left text-sm text-red-400">{errors.description?.message}</p>
          ) : null}
        </div>

        <div className="flex items-start gap-3 rounded-md border p-3">
          <Checkbox
            id="create-module-discussion"
            checked={watch('settings.discussionEnabled') !== false}
            onCheckedChange={(c) => {
              setValue('settings.discussionEnabled', c === true);
            }}
          />
          <div className="grid gap-1">
            <Label
              htmlFor="create-module-discussion"
              className="cursor-pointer text-sm font-medium">
              {t('discussionEnabled')}
            </Label>
            <p className="text-muted-foreground text-xs">{t('discussionEnabledHelp')}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('learningObjectives')}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addObjective}
              className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              {t('addObjective')}
            </Button>
          </div>

          {learningObjectives.map((objective, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={objective}
                onChange={(e) => updateObjective(index, e.target.value)}
                placeholder={t('learningObjectivePlaceholder', { index: index + 1 })}
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
        <DialogFooter>
          <Button type="submit" disabled={createModuleMutation.isPending}>
            {createModuleMutation.isPending ? t('creating') : t('create')}
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}

export default CreateModuleForm;
