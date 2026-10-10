import { Model, Types } from 'mongoose';
import { User } from 'src/user/entities/user.entity';
import { Course } from 'src/course/entities/course.entity';
import { Organization } from 'src/organization/entities/organization.entity';

/**
 * Shared state produced by seeders and consumed by later seeders in the pipeline.
 * Each key is populated by the seeder responsible for that domain; downstream
 * seeders may read values set by upstream ones.
 */
export interface SeedContext {
  /** Mongoose models keyed by model-name token (e.g. 'User', 'Course'). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  models: Map<string, Model<any>>;

  /** Domain-specific services (e.g. CurrencyService). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  services: Map<string, any>;

  /**
   * Shared runtime data written by seeders and read by later ones.
   *
   * Conventional keys:
   *   'organizations'  → Organization[]
   *   'instructors'    → Map<orgId, User[]>
   *   'students'       → Map<orgId, User[]>
   *   'courses'        → Map<orgId, Course[]>
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Map<string, any>;
}

/**
 * Common interface every module-level seeder should implement.
 *
 * Seeders are registered with the central runner which topologically sorts
 * them by `dependencies` and calls `seed()` in order, passing a shared
 * `SeedContext` so seeders can share produced data.
 */
export interface ISeeder {
  /** Unique name, used in dependency declarations. */
  readonly name: string;

  /**
   * Names of other seeders that must complete before this one runs.
   * The runner will topologically sort the list.
   */
  readonly dependencies: string[];

  /**
   * Execute the seed operation.
   * Seeders should write produced artifacts to `context.data` for downstream use.
   */
  seed(context: SeedContext): Promise<void>;
}

// ─── Convenience helpers ────────────────────────────────────────────────────

export function createSeedContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  models: Record<string, Model<any>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  services?: Record<string, any>
): SeedContext {
  return {
    models: new Map(Object.entries(models)),
    services: new Map(Object.entries(services ?? {})),
    data: new Map(),
  };
}

/**
 * Topological sort for seeders.
 * Throws if there is a circular dependency or an unknown dependency name.
 */
export function resolveSeedOrder(seeders: ISeeder[]): ISeeder[] {
  const map = new Map(seeders.map((s) => [s.name, s]));
  const visited = new Set<string>();
  const result: ISeeder[] = [];

  const visit = (name: string, chain: string[]) => {
    if (visited.has(name)) return;
    if (chain.includes(name)) {
      throw new Error(`Circular seeder dependency detected: ${[...chain, name].join(' → ')}`);
    }
    const seeder = map.get(name);
    if (!seeder) throw new Error(`Unknown seeder dependency: "${name}"`);
    for (const dep of seeder.dependencies) {
      visit(dep, [...chain, name]);
    }
    visited.add(name);
    result.push(seeder);
  };

  for (const s of seeders) visit(s.name, []);
  return result;
}

// ─── Typed context accessors ────────────────────────────────────────────────

export function getOrgStudents(context: SeedContext, orgId: Types.ObjectId): User[] {
  const map = (context.data.get('students') as Map<string, User[]> | undefined) ?? new Map<string, User[]>();
  return map.get(orgId.toString()) ?? [];
}

export function getOrgInstructors(context: SeedContext, orgId: Types.ObjectId): User[] {
  const map = (context.data.get('instructors') as Map<string, User[]> | undefined) ?? new Map<string, User[]>();
  return map.get(orgId.toString()) ?? [];
}

export function getOrgCourses(context: SeedContext, orgId: Types.ObjectId): Course[] {
  const map = (context.data.get('courses') as Map<string, Course[]> | undefined) ?? new Map<string, Course[]>();
  return map.get(orgId.toString()) ?? [];
}

export function getOrganizations(context: SeedContext): Organization[] {
  return (context.data.get('organizations') as Organization[] | undefined) ?? [];
}
