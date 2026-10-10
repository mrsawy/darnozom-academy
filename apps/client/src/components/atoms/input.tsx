import * as React from 'react';

import { cn } from '@/lib/utils';
import { getDir } from '@/lib/utils/text-direction';
import { useLocale } from 'next-intl';

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]): (instance: T | null) => void {
  return (instance) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') ref(instance);
      else if (ref != null) ref.current = instance;
    });
  };
}

type InputProps = React.ComponentProps<'input'> & {
  /** When type="number", value can be number; stored and passed to the DOM as string. */
  value?: string | number;
  /** When type="number", defaultValue can be number. */
  defaultValue?: string | number;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type, value, defaultValue, onChange, ...props },
  refProp
) {
  const locale = useLocale();
  const isControlled = value !== undefined;
  const inputRef = React.useRef<HTMLInputElement>(null);

  // For number inputs, normalize value/defaultValue to string for the DOM
  const valueStr =
    type === 'number' && value !== undefined ? (value === '' ? '' : String(value)) : value;
  const defaultValueStr =
    type === 'number' && defaultValue !== undefined
      ? defaultValue === ''
        ? ''
        : String(defaultValue)
      : defaultValue;

  // For controlled: derive dir every render so direction is correct on first paint
  const controlledDir = isControlled ? getDir(String(valueStr ?? ''), locale) : null;

  // For uncontrolled: state + sync from DOM so direction works with react-hook-form (no value prop)
  const [uncontrolledDir, setUncontrolledDir] = React.useState<'rtl' | 'ltr'>(() =>
    getDir(String(defaultValueStr ?? ''), locale)
  );

  const syncDirFromDom = React.useCallback(() => {
    if (isControlled || !inputRef.current) return;
    const next = getDir(inputRef.current.value ?? '', locale);
    setUncontrolledDir((prev) => (prev === next ? prev : next));
  }, [locale, isControlled]);

  // Sync dir from DOM on mount and after paint (catches react-hook-form reset/setValue)
  React.useLayoutEffect(syncDirFromDom, [syncDirFromDom]);
  React.useEffect(() => {
    syncDirFromDom();
    // RHF often sets value in an effect; run again next frame to pick it up
    const id = requestAnimationFrame(() => syncDirFromDom());
    return () => cancelAnimationFrame(id);
  }, [syncDirFromDom]);

  React.useEffect(() => {
    if (!isControlled) {
      setUncontrolledDir(getDir(String(defaultValueStr ?? ''), locale));
    }
  }, [defaultValueStr, locale, isControlled]);

  const dir: 'rtl' | 'ltr' = (isControlled ? controlledDir : uncontrolledDir) ?? getDir('', locale);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setUncontrolledDir(getDir(e.target.value, locale));
      }
      onChange?.(e);
    },
    [onChange, locale, isControlled]
  );

  return (
    <input
      ref={mergeRefs(inputRef, refProp)}
      type={type}
      dir={dir}
      data-slot="input"
      value={valueStr}
      defaultValue={defaultValueStr}
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className
      )}
      {...props}
      onChange={handleChange}
    />
  );
});

export { Input };
