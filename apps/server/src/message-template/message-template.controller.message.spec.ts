import { MessageTemplateControllerMessage } from './message-template.controller.message';

describe('MessageTemplateControllerMessage', () => {
  it('should be defined', () => {
    const templateService = { create: jest.fn(), findAll: jest.fn(), findOne: jest.fn(), update: jest.fn(), remove: jest.fn() };
    const renderService = { render: jest.fn() };
    const ctrl = new MessageTemplateControllerMessage(templateService as any, renderService as any);
    expect(ctrl).toBeDefined();
  });
});
