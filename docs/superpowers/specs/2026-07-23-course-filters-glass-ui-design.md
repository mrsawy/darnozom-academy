# Course Filters Glass UI Enhancement

## Overview
Enhance the design of `course-filters.tsx` in `apps/lms-mobile` by adopting the new Glass UI design system and updating the Grades and School Types filters to support multiple selections using pill buttons, matching the `instructor-filters.tsx` implementation.

## 1. Glass UI Adoption
Replace existing standard UI components with their Glass UI equivalents:
- **Inputs**: Use `GlassTextInput` for Price Range (Min/Max) and Minimum Modules.
- **Selects**: Use `GlassSelectInput` for the Currency selector in the Price Range section.
- **Buttons**: Use `GlassButton` for:
  - Billing Cycle toggles
  - Minimum Rating toggles
  - Footer buttons (Reset / Apply)

## 2. Grades & School Types Updates
- **Component**: Replace `RNPickerSelect` with a flex-wrap container of `Pressable` pill buttons for both Grades and School Types.
- **State**: Update the local state to handle arrays of IDs (`gradeIds`, `schoolTypeIds`) instead of single strings.
- **Interface**: Update `ICourseFilters` in `apps/lms-mobile/lib/types/course/ICourse-filters.interface.ts` to support `gradeIds?: string[]` and `schoolTypeIds?: string[]` (replacing `gradeId` and `schoolTypeId`).
- **API Action**: Ensure `getFilteredCourses` (or relevant action) correctly serializes `gradeIds` and `schoolTypeIds` to the API.

## 3. Styling & Layout
- Maintain the overall scrollable layout with a fixed footer.
- Ensure consistent spacing (e.g., `mb-6` for sections, `gap-2` for pills).
- Use the `THEME` palette and `colorScheme` appropriately with the Glass components.
