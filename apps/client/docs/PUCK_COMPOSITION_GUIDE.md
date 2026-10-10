# Puck Editor Composition Quick Reference

## Field Builders

### Basic Fields

```tsx
import { textField, textareaField, linkField, colorField, numberField } from './utils';

// Text input with in-place editing
title: textField(true); // contentEditable: true
name: textField(false); // contentEditable: false

// Textarea with in-place editing
description: textareaField(true);
bio: textareaField(false);

// URL input
ctaLink: linkField();

// Color picker
primaryColor: colorField();

// Number input with optional min/max
opacity: numberField(0, 1);
count: numberField();
```

### Selection Fields

```tsx
import { radioField, selectField } from './utils';

// Radio buttons
showIcon: radioField([
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
]);

// Dropdown select
layout: selectField([
  { label: 'Grid', value: 'grid' },
  { label: 'List', value: 'list' },
]);
```

### Complex Fields

```tsx
import { arrayField, imageField } from './utils';

// Array of items
features: arrayField({
  title: textField(true),
  description: textareaField(true),
  icon: textField(true),
});

// Image picker (uses gallery)
backgroundImage: imageField;
avatar: imageField;
```

## Pre-built Field Groups

### Title & Subtitle

```tsx
import { titleFields, subtitleFields } from "./utils";

fields: {
    ...titleFields,      // Adds: title, titleSize
    ...subtitleFields,   // Adds: subtitle, subtitleSize
}

defaultProps: {
    title: "My Title",
    titleSize: "text-4xl md:text-5xl",
    subtitle: "My subtitle",
    subtitleSize: "text-lg md:text-xl",
}
```

### Buttons

```tsx
import { buttonFields, secondaryButtonFields } from "./utils";

fields: {
    ...buttonFields,           // Adds: ctaText, ctaLink, buttonStyle, buttonSize
    ...secondaryButtonFields,  // Adds: secondaryCtaText, secondaryCtaLink
}

defaultProps: {
    ctaText: "Get Started",
    ctaLink: "#",
    buttonStyle: "rounded-lg",
    buttonSize: "px-8 py-4 text-lg",
    secondaryCtaText: "Learn More",
    secondaryCtaLink: "#",
}
```

### Colors & Styling

```tsx
import { colorFields, alignmentField, animationField, styleFields } from "./utils";

fields: {
    ...colorFields,        // Adds: backgroundColor, textColor
    alignment: alignmentField,  // Left/Center/Right
    animation: animationField,  // None/Fade/Slide/etc
    ...styleFields,        // Adds: paddingTop, paddingBottom, marginTop, marginBottom
}
```

## Complete Component Template

```tsx
import { styleFields, defaultStyleProps, getStyleProps, textField, textareaField, titleFields, subtitleFields, buttonFields, colorFields, selectField, arrayField, imageField, animationField } from './utils';

export const MySection = () => {
  return {
    fields: {
      // Spacing controls
      ...styleFields,

      // Title with size control
      ...titleFields,

      // Subtitle with size control
      ...subtitleFields,

      // Primary button
      ...buttonFields,

      // Colors
      ...colorFields,

      // Custom fields
      layout: selectField([
        { label: 'Grid', value: 'grid' },
        { label: 'List', value: 'list' },
      ]),

      animation: animationField,

      items: arrayField({
        title: textField(true),
        description: textareaField(true),
        image: imageField,
      }),
    },

    defaultProps: {
      // Default spacing
      ...defaultStyleProps,

      // Title defaults
      title: 'Section Title',
      titleSize: 'text-4xl md:text-5xl',

      // Subtitle defaults
      subtitle: 'Section subtitle',
      subtitleSize: 'text-lg md:text-xl',

      // Button defaults
      ctaText: 'Click Here',
      ctaLink: '#',
      buttonStyle: 'rounded-lg',
      buttonSize: 'px-8 py-4 text-lg',

      // Color defaults
      backgroundColor: '#ffffff',
      textColor: '#1f2937',

      // Custom defaults
      layout: 'grid',
      animation: 'fade',
      items: [{ title: 'Item 1', description: 'Description', image: '' }],
    },

    render: ({ title, titleSize, subtitle, subtitleSize, ctaText, ctaLink, buttonStyle, buttonSize, backgroundColor, textColor, layout, animation, items, ...props }: any) => {
      // Get spacing styles
      const styleProps = getStyleProps(props);

      // Animation class
      const animationClass = animation === 'fade' ? 'animate-fadeIn' : animation === 'slide' ? 'animate-slideUp' : '';

      return (
        <div className="px-6 py-20" style={{ ...styleProps, backgroundColor }}>
          <div className="mx-auto max-w-7xl">
            {/* Title */}
            <h2 className={`${titleSize} mb-4 font-bold`} style={{ color: textColor }}>
              {title}
            </h2>

            {/* Subtitle */}
            <p className={`${subtitleSize} mb-8`} style={{ color: textColor }}>
              {subtitle}
            </p>

            {/* Items */}
            <div className={`grid gap-6 ${layout === 'grid' ? 'grid-cols-3' : 'grid-cols-1'}`}>
              {items?.map((item: any, idx: number) => (
                <div key={idx} className={`rounded-lg bg-white p-6 ${animationClass}`} style={{ animationDelay: `${idx * 100}ms` }}>
                  {item.image && <img src={item.image} alt={item.title} />}
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>

            {/* Button */}
            <a href={ctaLink} className={`inline-block bg-purple-600 text-white ${buttonSize} ${buttonStyle} font-semibold transition-colors hover:bg-purple-700`}>
              {ctaText}
            </a>
          </div>
        </div>
      );
    },
  };
};

export default MySection;
```

## Common Patterns

### Staggered Animations

```tsx
{
  items?.map((item: any, idx: number) => (
    <div key={idx} className={animationClass} style={{ animationDelay: `${idx * 100}ms` }}>
      {/* content */}
    </div>
  ));
}
```

### Conditional Rendering

```tsx
{
  showIcon === 'yes' && icon && <div className="text-4xl">{icon}</div>;
}

{
  backgroundImage && <div className="absolute inset-0" style={{ backgroundImage: `url(${backgroundImage})` }} />;
}
```

### Hover Effects

```tsx
className = 'hover:shadow-2xl hover:-translate-y-2 transition-all duration-300';
className = 'hover:scale-105 transition-transform';
className = 'grayscale hover:grayscale-0 transition-all';
```

### Responsive Grids

```tsx
// 2 columns
className = 'grid grid-cols-1 md:grid-cols-2 gap-8';

// 3 columns
className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8';

// 4 columns
className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8';
```

## Style Props Usage

```tsx
// In render function
const styleProps = getStyleProps(props);

// Apply to container
<div style={{ ...styleProps, backgroundColor }}>{/* content */}</div>;

// This gives you:
// - paddingTop
// - paddingBottom
// - marginTop
// - marginBottom
```

## Animation Classes

Available animation values:

- `"none"` - No animation
- `"fade"` - Fade in
- `"slide"` - Slide up
- `"slideDown"` - Slide down
- `"scale"` - Scale in

Usage:

```tsx
const animationClass = animation === 'fade' ? 'animate-fadeIn' : animation === 'slide' ? 'animate-slideUp' : animation === 'slideDown' ? 'animate-slideDown' : animation === 'scale' ? 'animate-scale' : '';
```

## Tips & Best Practices

1. **Always spread styleFields first** in fields definition
2. **Always spread defaultStyleProps first** in defaultProps
3. **Extract styleProps** in render function with `getStyleProps(props)`
4. **Use contentEditable: true** for user-facing text
5. **Use contentEditable: false** for technical fields (URLs, IDs, etc.)
6. **Add animationDelay** for staggered effects: `${idx * 100}ms`
7. **Use semantic HTML** (h1, h2, p, article, section, etc.)
8. **Make colors customizable** via colorFields
9. **Provide sensible defaults** for all fields
10. **Test responsive layouts** at different breakpoints

## Adding to Puck Editor

```tsx
// 1. Import in puck-editor.tsx
import MySection from '../__sections/mySection.section';

// 2. Add to appropriate category
categories: {
    MyCategory: {
        components: ['MySection'],
    },
}

// 3. Add to components
components: {
    MySection: MySection(),
}
```
