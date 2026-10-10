# Course Filters Glass UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the course filters design by adopting the Glass UI system and using multi-select pill buttons for Grades and School Types.

**Architecture:** We will update the `ICourseFilters` interface to support arrays for grades and school types, then refactor `course-filters.tsx` to replace standard inputs/buttons with `GlassTextInput`, `GlassSelectInput`, and `GlassButton`, and implement pill buttons for the multi-select fields.

**Tech Stack:** React Native, NativeWind, Expo

## Global Constraints
- Use exact imports from `@/components/atoms/native` for Glass components.
- Maintain existing translation keys and localization logic.

---

### Task 1: Update ICourseFilters Interface

**Files:**
- Modify: `apps/lms-mobile/lib/types/course/ICourse-filters.interface.ts`

**Interfaces:**
- Produces: Updated `ICourseFilters` with `gradeIds?: string[]` and `schoolTypeIds?: string[]`.

- [ ] **Step 1: Modify the interface**

```typescript
// apps/lms-mobile/lib/types/course/ICourse-filters.interface.ts
import { BillingCycle } from '@/lib/constants/billing-cycle.enum';
import { PaginationOptions } from '../paginated.interface';

export type ICourseFilters = PaginationOptions<{
  maxPrice?: number;
  minPrice?: number;
  priceCurrency?: string;
  billingCycle?: BillingCycle;
  minRating?: number;
  minModules?: number;
  searchCategories?: string;
  /** Multi-select subject filter — category ids (serialized to CSV for the request). */
  categoryIds?: string[];
  gradeIds?: string[];
  schoolTypeIds?: string[];
}>;
```

- [ ] **Step 2: Commit**

```bash
git add apps/lms-mobile/lib/types/course/ICourse-filters.interface.ts
git commit -m "refactor(lms-mobile): update ICourseFilters to support multiple grades and school types"
```

---

### Task 2: Refactor Course Filters UI

**Files:**
- Modify: `apps/lms-mobile/components/organs/courses/browse-tabs/course-filters.tsx`

**Interfaces:**
- Consumes: Updated `ICourseFilters` from Task 1.

- [ ] **Step 1: Update imports and add toggleId helper**

Add imports for Glass components and `Pressable`, remove unused `RNPickerSelect` (if completely replaced, though we use `GlassSelectInput` which wraps `NativePicker`), and add the `toggleId` helper.

```tsx
// At the top of apps/lms-mobile/components/organs/courses/browse-tabs/course-filters.tsx
import { useState, useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/atoms/text';
import { Label } from '@/components/atoms/label';
import { GlassButton, GlassTextInput, GlassSelectInput } from '@/components/atoms/native';
import { useFilteredCategories } from '@/lib/hooks/categories.hook';
import { useGrades } from '@/lib/hooks/grades.hook';
import { useSchoolTypes } from '@/lib/hooks/school-types.hook';
import { Currency } from '@/lib/constants/currency.enum';
import { BillingCycle } from '@/lib/constants/billing-cycle.enum';
import { ICourseFilters } from '@/lib/types/course/ICourse-filters.interface';
import { X } from 'lucide-react-native';
import SearchableMultiSelect, {
  type MultiSelectOption,
} from '../../searchable-multi-select';
import { THEME } from '@/lib/theme';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import { localizedLookupName } from '@/lib/utils/localized-lookup';

function labelForBillingCycle(cycle: BillingCycle, t: (key: string) => string) {
// ... existing switch statement ...
}

/** Toggles a single id in/out of a multi-select array. */
function toggleId(list: string[] | undefined, id: string): string[] {
  const current = list ?? [];
  return current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
}
```

- [ ] **Step 2: Update local state reset and handleApply**

Update `handleReset` to clear `gradeIds` and `schoolTypeIds`.

```tsx
// Inside FiltersModal component
  const handleReset = () => {
    const resetFilters: ICourseFilters = {
      priceCurrency: Currency.EGP,
      page: 1,
      limit: 10,
      billingCycle: BillingCycle.MONTHLY,
      gradeIds: undefined,
      schoolTypeIds: undefined,
    };
    setLocalFilters(resetFilters);
    setLocalCategories([]);
  };
```

- [ ] **Step 3: Replace standard components with Glass UI**

Replace `Button` with `GlassButton`, `Input` with `GlassTextInput`, and `RNPickerSelect` with `GlassSelectInput` (for Currency). Replace Grades and School Types with Pill Buttons.

```tsx
// Replace Header Button
        <GlassButton variant="outline" style={{ paddingVertical: 8, paddingHorizontal: 12 }} onPress={onClose} label={<X size={18} color={theme.foreground} />} />

// Replace Billing Cycle Buttons
            {Object.values(BillingCycle).map((cycle) => (
              <View key={cycle} className="flex-1">
                <GlassButton
                  variant={localFilters.billingCycle === cycle ? 'primary' : 'default'}
                  onPress={() => setLocalFilters((prev) => ({ ...prev, billingCycle: cycle }))}
                  label={labelForBillingCycle(cycle, t)}
                />
              </View>
            ))}

// Replace Price Range Inputs
              <GlassTextInput
                placeholder="0"
                value={localFilters.minPrice?.toString() || ''}
                onChangeText={(text) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    minPrice: text ? Number(text) : undefined,
                  }))
                }
                keyboardType="numeric"
              />
// ... same for maxPrice

// Replace Currency Picker
              <GlassSelectInput
                onValueChange={(value) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    priceCurrency: value as Currency,
                  }))
                }
                selectedValue={localFilters.priceCurrency}
                placeholder={{ label: t('courseFilters.selectCurrency'), value: null }}
                options={Object.values(Currency).map((currency) => ({
                  label: currency,
                  value: currency,
                }))}
              />

// Replace Grades with Pill Buttons
        <View className="mx-4 mb-6">
          <Label className="mb-3">{t('courseFilters.grade')}</Label>
          <View className="flex-row flex-wrap gap-2">
            {grades.map((grade) => {
              const selected = (localFilters.gradeIds ?? []).includes(grade._id);
              return (
                <Pressable
                  key={grade._id}
                  onPress={() =>
                    setLocalFilters((prev) => {
                      const next = toggleId(prev.gradeIds, grade._id);
                      return { ...prev, gradeIds: next.length > 0 ? next : undefined };
                    })
                  }
                  className={`rounded-full border px-4 py-2 ${
                    selected ? 'border-primary bg-primary' : 'border-border bg-background'
                  }`}>
                  <Text className={selected ? 'text-primary-foreground' : 'text-foreground'}>
                    {localizedLookupName(grade, i18n.language) ?? grade.nameEn}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

// Replace School Types with Pill Buttons (similar to Grades)
        <View className="mx-4 mb-6">
          <Label className="mb-3">{t('courseFilters.schoolType')}</Label>
          <View className="flex-row flex-wrap gap-2">
            {schoolTypes.map((schoolType) => {
              const selected = (localFilters.schoolTypeIds ?? []).includes(schoolType._id);
              return (
                <Pressable
                  key={schoolType._id}
                  onPress={() =>
                    setLocalFilters((prev) => {
                      const next = toggleId(prev.schoolTypeIds, schoolType._id);
                      return { ...prev, schoolTypeIds: next.length > 0 ? next : undefined };
                    })
                  }
                  className={`rounded-full border px-4 py-2 ${
                    selected ? 'border-primary bg-primary' : 'border-border bg-background'
                  }`}>
                  <Text className={selected ? 'text-primary-foreground' : 'text-foreground'}>
                    {localizedLookupName(schoolType, i18n.language) ?? schoolType.nameEn}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

// Replace Minimum Rating Buttons
            {[3, 4, 5].map((rating) => (
              <View key={rating} className="flex-1">
                <GlassButton
                  variant={localFilters.minRating === rating ? 'primary' : 'default'}
                  onPress={() =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      minRating: prev.minRating === rating ? undefined : rating,
                    }))
                  }
                  label={t('browseCoursesTab.minRating', { rating })}
                />
              </View>
            ))}

// Replace Minimum Modules Input
          <GlassTextInput
            placeholder={t('courseFilters.modulesPlaceholder')}
            value={localFilters.minModules?.toString() || ''}
            onChangeText={(text) =>
              setLocalFilters((prev) => ({
                ...prev,
                minModules: text ? Number(text) : undefined,
              }))
            }
            keyboardType="numeric"
          />

// Replace Footer Buttons
      <View className="mx-4 flex-row gap-3 py-4">
        <View className="flex-1">
          <GlassButton variant="default" onPress={handleReset} label={t('courseFilters.reset')} />
        </View>
        <View className="flex-[2]">
          <GlassButton variant="primary" onPress={handleApply} label={t('courseFilters.apply')} />
        </View>
      </View>
```

- [ ] **Step 4: Remove unused styles**

Remove the `pickerStyle` object since `GlassSelectInput` handles its own styling.

- [ ] **Step 5: Commit**

```bash
git add apps/lms-mobile/components/organs/courses/browse-tabs/course-filters.tsx
git commit -m "feat(lms-mobile): adopt Glass UI and pill buttons in course filters"
```
