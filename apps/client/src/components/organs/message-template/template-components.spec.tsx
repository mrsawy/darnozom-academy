import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { IMessageTemplate } from '@darnozom/shared-types';
import { MessageTemplatesScreen } from './message-templates-screen';
import { TemplateEditorDialog } from './template-editor-dialog';
import { SendTemplateDialog } from './send-template-dialog';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
  useLocale: () => 'en',
}));

const mockDelete = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRenderMutate = vi.fn();
const mockRenderReset = vi.fn();

const mockTemplates: IMessageTemplate[] = [
  {
    _id: 'tmpl-1',
    organizationId: 'org-1',
    name: 'Welcome Template',
    context: 'STUDENT',
    body: 'Hello {{studentName}}, welcome to {{groupName}}!',
    createdBy: 'user-1',
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
  },
  {
    _id: 'tmpl-2',
    organizationId: 'org-1',
    name: 'Group Session Announcement',
    context: 'GROUP',
    body: 'Reminder: {{groupName}} starts at {{startDate}}.',
    createdBy: 'user-1',
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
  },
];

let mockRenderData: unknown = null;

vi.mock('@/lib/hooks/message-template/use-message-template.hook', () => ({
  useMessageTemplates: vi.fn(() => ({ data: mockTemplates, isLoading: false })),
  useDeleteTemplate: vi.fn(() => ({ mutate: mockDelete, isPending: false })),
  useCreateTemplate: vi.fn(() => ({ mutate: mockCreate, isPending: false })),
  useUpdateTemplate: vi.fn(() => ({ mutate: mockUpdate, isPending: false })),
  useRenderTemplate: vi.fn(() => ({
    data: mockRenderData,
    mutate: mockRenderMutate,
    reset: mockRenderReset,
    isPending: false,
  })),
}));

describe('MessageTemplatesScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header and list of templates', () => {
    render(<MessageTemplatesScreen />);
    expect(screen.getByText('pageTitle')).toBeInTheDocument();
    expect(screen.getByText('Welcome Template')).toBeInTheDocument();
    expect(screen.getByText('Group Session Announcement')).toBeInTheDocument();
  });

  it('triggers delete mutation when delete button is clicked', () => {
    render(<MessageTemplatesScreen />);
    const deleteButtons = screen.getAllByText('table.delete');
    fireEvent.click(deleteButtons[0]);
    expect(mockDelete).toHaveBeenCalledWith('tmpl-1');
  });

  it('opens create dialog on clicking create button', () => {
    render(<MessageTemplatesScreen />);
    const createBtn = screen.getByRole('button', { name: 'createButton' });
    fireEvent.click(createBtn);
    expect(screen.getByText('createTitle')).toBeInTheDocument();
  });
});

describe('TemplateEditorDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders in create mode with empty fields', () => {
    render(<TemplateEditorDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('createTitle')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('form.namePlaceholder')).toHaveValue('');
  });

  it('renders in edit mode with template values', () => {
    render(
      <TemplateEditorDialog
        open={true}
        onOpenChange={vi.fn()}
        template={mockTemplates[0]}
      />
    );
    expect(screen.getByText('editTitle')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('form.namePlaceholder')).toHaveValue('Welcome Template');
  });

  it('inserts variable into body on clicking variable badge', () => {
    render(<TemplateEditorDialog open={true} onOpenChange={vi.fn()} />);
    const varBadge = screen.getByText('{{studentName}}');
    fireEvent.click(varBadge);
    const textarea = screen.getByPlaceholderText('form.bodyPlaceholder');
    expect(textarea).toHaveValue('{{studentName}}');
  });
});

describe('SendTemplateDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderData = null;
  });

  it('renders dialog with template select', () => {
    render(
      <SendTemplateDialog
        open={true}
        onOpenChange={vi.fn()}
        groupId="group-1"
        students={[{ _id: 's-1', name: 'Zaid' }]}
      />
    );
    expect(screen.getByText('sendDialog.title')).toBeInTheDocument();
  });

  it('shows rendered preview and waLink when result exists', () => {
    mockRenderData = {
      text: 'Hello Zaid, welcome to Quran 101!',
      missingVariables: [],
      phone: '+201234567890',
      waLink: 'https://wa.me/201234567890?text=Hello',
    };

    render(
      <SendTemplateDialog
        open={true}
        onOpenChange={vi.fn()}
        groupId="group-1"
        students={[{ _id: 's-1', name: 'Zaid' }]}
      />
    );

    expect(screen.getByText('Hello Zaid, welcome to Quran 101!')).toBeInTheDocument();
    expect(screen.getByText('sendDialog.openWhatsApp')).toBeInTheDocument();
  });
});
