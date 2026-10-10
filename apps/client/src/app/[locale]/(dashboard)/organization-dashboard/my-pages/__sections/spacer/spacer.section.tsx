import { selectField } from '../utils';
import type { SpacerSectionProps } from './types';

const SpacerSection = () => {
  return {
    fields: {
      height: selectField([
        { label: 'Extra Small (16px)', value: '16px' },
        { label: 'Small (32px)', value: '32px' },
        { label: 'Medium (64px)', value: '64px' },
        { label: 'Large (96px)', value: '96px' },
        { label: 'Extra Large (128px)', value: '128px' },
        { label: 'Huge (192px)', value: '192px' },
      ]),
      showOnMobile: selectField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
    },
    defaultProps: {
      height: '64px',
      showOnMobile: 'yes',
    },
    render: ({ height, showOnMobile }: SpacerSectionProps) => {
      return (
        <div
          aria-hidden="true"
          className={showOnMobile === 'no' ? 'hidden md:block' : 'block'}
          style={{ height }}
        />
      );
    },
  };
};

export default SpacerSection;
