import { GalleryPicker } from '../../../../../../components/molecules/gallery-picker';

// ============ COMPOSITION FIELDS ============
// Reusable field definitions with contentEditable enabled

interface ImageFieldRenderProps {
  value: string;
  onChange: (value: string) => void;
}

// Helper for Image Fields in Puck to use the Gallery Picker
export const imageField = {
  type: 'custom',
  render: ({ value, onChange }: ImageFieldRenderProps) => (
    <GalleryPicker value={value} onChange={onChange} />
  ),
};

export const textField = (contentEditable = true) => ({
  type: 'text' as const,
  contentEditable,
});

export const textareaField = (contentEditable = true) => ({
  type: 'textarea' as const,
  contentEditable,
});

export const linkField = () => ({
  type: 'text' as const,
  label: 'URL',
});

export const colorField = (_defaultValue?: string) => ({
  type: 'text' as const,
  label: 'Color (hex)',
});

export const numberField = (min?: number, max?: number) => ({
  type: 'number' as const,
  min,
  max,
});

export const radioField = (options: { label: string; value: string }[]) => ({
  type: 'radio' as const,
  options,
});

export const selectField = (options: { label: string; value: string }[]) => ({
  type: 'select' as const,
  options,
});

type ArrayFieldConfig = Record<string, { type: string; [key: string]: unknown }>;

export const arrayField = (arrayFields: ArrayFieldConfig) => ({
  type: 'array' as const,
  arrayFields,
});

// ============ COMMON FIELD GROUPS ============

export const titleFields = {
  title: textField(true),
  titleSize: selectField([
    { label: 'Small', value: 'text-3xl md:text-4xl' },
    { label: 'Medium', value: 'text-4xl md:text-5xl' },
    { label: 'Large', value: 'text-5xl md:text-6xl' },
    { label: 'Extra Large', value: 'text-6xl md:text-7xl' },
  ]),
};

export const subtitleFields = {
  subtitle: textareaField(true),
  subtitleSize: selectField([
    { label: 'Small', value: 'text-base md:text-lg' },
    { label: 'Medium', value: 'text-lg md:text-xl' },
    { label: 'Large', value: 'text-xl md:text-2xl' },
  ]),
};

export const buttonFields = {
  ctaText: textField(true),
  ctaLink: linkField(),
  buttonStyle: selectField([
    { label: 'Rounded', value: 'rounded-lg' },
    { label: 'Pill', value: 'rounded-full' },
    { label: 'Square', value: 'rounded-none' },
  ]),
  buttonSize: selectField([
    { label: 'Small', value: 'px-6 py-2 text-sm' },
    { label: 'Medium', value: 'px-8 py-4 text-lg' },
    { label: 'Large', value: 'px-10 py-5 text-xl' },
  ]),
};

export const secondaryButtonFields = {
  secondaryCtaText: textField(true),
  secondaryCtaLink: linkField(),
};

export const colorFields = {
  backgroundColor: colorField(),
  textColor: colorField(),
};

export const alignmentField = selectField([
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
]);

export const animationField = selectField([
  { label: 'None', value: 'none' },
  { label: 'Fade In', value: 'fade' },
  { label: 'Slide Up', value: 'slide' },
  { label: 'Slide Down', value: 'slideDown' },
  { label: 'Scale', value: 'scale' },
]);

// ============ STYLE FIELDS ============

export const styleFields = {
  // Spacing
  paddingTop: selectField([
    { label: 'None', value: '0px' },
    { label: 'Small (32px)', value: '32px' },
    { label: 'Medium (64px)', value: '64px' },
    { label: 'Large (80px)', value: '80px' },
    { label: 'Extra Large (120px)', value: '120px' },
  ]),
  paddingBottom: selectField([
    { label: 'None', value: '0px' },
    { label: 'Small (32px)', value: '32px' },
    { label: 'Medium (64px)', value: '64px' },
    { label: 'Large (80px)', value: '80px' },
    { label: 'Extra Large (120px)', value: '120px' },
  ]),
  marginTop: selectField([
    { label: 'None', value: '0px' },
    { label: 'Small', value: '32px' },
    { label: 'Medium', value: '64px' },
    { label: 'Large', value: '80px' },
    { label: 'Negative Small', value: '-32px' },
  ]),
  marginBottom: selectField([
    { label: 'None', value: '0px' },
    { label: 'Small', value: '32px' },
    { label: 'Medium', value: '64px' },
    { label: 'Large', value: '80px' },
  ]),
  // Background Image
  sectionBackgroundImage: imageField,
  sectionBackgroundSize: selectField([
    { label: 'Cover', value: 'cover' },
    { label: 'Contain', value: 'contain' },
    { label: 'Auto', value: 'auto' },
  ]),
  sectionBackgroundPosition: selectField([
    { label: 'Center', value: 'center' },
    { label: 'Top', value: 'top' },
    { label: 'Bottom', value: 'bottom' },
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' },
  ]),
};

export const defaultStyleProps = {
  paddingTop: '80px',
  paddingBottom: '80px',
  marginTop: '0px',
  marginBottom: '0px',
  sectionBackgroundImage: '',
  sectionBackgroundSize: 'cover',
  sectionBackgroundPosition: 'center',
};

export interface StyleProps {
  paddingTop?: string;
  paddingBottom?: string;
  marginTop?: string;
  marginBottom?: string;
  sectionBackgroundImage?: string;
  sectionBackgroundSize?: string;
  sectionBackgroundPosition?: string;
}

export const getStyleProps = (props: StyleProps) => {
  return {
    paddingTop: props.paddingTop,
    paddingBottom: props.paddingBottom,
    marginTop: props.marginTop,
    marginBottom: props.marginBottom,
    backgroundImage: props.sectionBackgroundImage
      ? `url(${props.sectionBackgroundImage})`
      : undefined,
    backgroundSize: props.sectionBackgroundImage ? props.sectionBackgroundSize : undefined,
    backgroundPosition: props.sectionBackgroundImage ? props.sectionBackgroundPosition : undefined,
  };
};
