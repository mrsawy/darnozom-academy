import type { QueryClient } from '@tanstack/react-query';
import type { useRouter } from '@/i18n/navigation';
import type { INotification } from '@/lib/actions/notification/notification.action';
import type { NotificationTranslate } from './translate-notification';

/** Router returned by `@/i18n/navigation`'s `useRouter` — used for programmatic navigation on click. */
export type NotificationRouter = ReturnType<typeof useRouter>;

export interface NotificationClickContext {
  router: NotificationRouter;
  queryClient: QueryClient;
}

/**
 * One handler per notification `type`. Put everything specific to a type — the toast shown when it
 * arrives live, and what happens when the student clicks it in the dropdown — in its own file under
 * `handlers/`, and register it in `notification-handlers.registry.ts`.
 */
export interface NotificationTypeHandler {
  /** Toast shown when this type arrives live over the socket. Only types wired into a realtime event fire this. */
  showArrivalToast(notification: INotification, t: NotificationTranslate): void;
  /** What happens when the student clicks this notification in the dropdown. Defaults to no navigation. */
  handleClick(notification: INotification, ctx: NotificationClickContext): void | Promise<void>;
}
