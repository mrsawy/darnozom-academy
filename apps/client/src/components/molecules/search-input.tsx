'use client';

import * as React from 'react';
import { IconSearch } from '@tabler/icons-react';
import { Input } from '@/components/atoms/input';
import { cn } from '@/lib/utils';

export interface SearchInputProps extends Omit<React.ComponentProps<typeof Input>, 'type'> {
  placeholder?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ placeholder, className, ...props }, ref) => {
    return (
      <div className={cn('relative', className)}>
        <IconSearch className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
        <Input ref={ref} type="search" placeholder={placeholder} className="pl-8" {...props} />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
