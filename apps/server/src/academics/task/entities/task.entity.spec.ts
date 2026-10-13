import { ReadinessKey, TaskKind, TaskStatus } from '@darnozom/shared-types';
import { TaskSchema } from './task.entity';

const indexNames = () => TaskSchema.indexes().map(([, options]) => options?.name);
const schemaPath = (name: string) => TaskSchema.path(name) as unknown as { options: Record<string, unknown> };

describe('TaskSchema', () => {
  it('allows only one open task per group and readiness item', () => {
    const entry = TaskSchema.indexes().find(([, options]) => options?.name === 'one_open_task_per_group_item');
    expect(entry).toBeDefined();
    const [fields, options] = entry!;
    expect(fields).toEqual({ groupId: 1, readinessKey: 1 });
    expect(options?.unique).toBe(true);
    expect(options?.partialFilterExpression).toEqual({ status: TaskStatus.OPEN });
  });

  it('indexes the three read paths the spec names', () => {
    expect(indexNames()).toEqual(expect.arrayContaining(['task_due_sweep', 'task_by_group_item', 'task_by_assignee']));
  });

  it('defaults a new task to the coordinator level and the open state', () => {
    expect(schemaPath('escalationLevel').options.default).toBe(0);
    expect(schemaPath('status').options.default).toBe(TaskStatus.OPEN);
    expect(schemaPath('kind').options.default).toBe(TaskKind.PRE_START_READINESS);
  });

  it('accepts every readiness key as a task subject', () => {
    const path = TaskSchema.path('readinessKey') as unknown as { options: { enum: string[] } };
    expect(path.options.enum).toEqual(Object.values(ReadinessKey));
  });

  it('allows a null assignee, which is the manager queue', () => {
    expect((TaskSchema.path('assigneeId') as unknown as { options: { default: unknown } }).options.default).toBeNull();
  });
});
