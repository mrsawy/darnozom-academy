export const USER_CREATED_FOR_AI_EVENT = 'user.created.for-ai';

export class UserCreatedForAiEvent {
  constructor(public readonly userId: string) {}
}
