export type EditFieldType = 'text' | 'number' | 'date' | 'textarea';

export interface EditField {
  /** Key in the values object handed to `onSave`. */
  name: string;
  label: string;
  type: EditFieldType;
  required?: boolean;
  min?: number;
  hint?: string;
}

export type EditFieldValues = Record<string, string>;
