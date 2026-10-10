import { extractErrorMessages } from '@/lib/utils/extractErrorMessages';
import { FieldErrors, FieldValues } from 'react-hook-form';

export const getErrorMessage = <T extends FieldValues>(
  error: FieldErrors<T>
): {
  errors: string[];
  messages: string[];
} => {
  const messages = extractErrorMessages(error);
  return {
    errors: messages.map((message) => message.split(':')[0]),
    messages: messages.map((message) => message.split(':')[1]),
  };
};
