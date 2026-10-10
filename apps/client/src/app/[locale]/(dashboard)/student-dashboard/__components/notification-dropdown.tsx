'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/popover';
import { IconBell } from '@tabler/icons-react';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@/lib/hooks/notification/use-notifications.hook';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { formatDistanceToNow } from 'date-fns';
import { handleNotificationClick } from '@/lib/realtime/notifications/handle-notification-click';
import {
  translateNotificationBody,
  translateNotificationTitle,
} from '@/lib/realtime/notifications/translate-notification';
import type { INotification } from '@/lib/actions/notification/notification.action';

export function NotificationDropdown() {
  const t = useTranslations('NotificationDropdown');
  const tNotifications = useTranslations('Notifications');
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useNotifications({ limit: 10, page: 1 });
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const router = useRouter();
  const queryClient = useQueryClient();

  const notifications = data?.docs ?? [];

  function handleClick(notification: INotification) {
    if (!notification.read) markAsRead.mutate(notification._id);
    setOpen(false);
    void handleNotificationClick(notification, { router, queryClient });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <IconBell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="sr-only">{t('openNotifications')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-start justify-between border-b px-3 py-2">
          <span className="font-medium">{t('notifications')}</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                markAllAsRead.mutate();
              }}>
              {t('markAllRead')}
            </Button>
          )}
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {isLoading ? (
            <div className="text-muted-foreground p-4 text-center text-sm">{t('loading')}</div>
          ) : notifications.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center text-sm">{t('empty')}</div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const title = translateNotificationTitle(n, tNotifications);
                const body = translateNotificationBody(n, tNotifications);
                return (
                  <button
                    type="button"
                    key={n._id}
                    tabIndex={0}
                    className={`hover:bg-muted/50 cursor-pointer px-3 py-2 text-sm transition-colors ${n.read ? 'opacity-75' : ''}`}
                    onClick={() => handleClick(n)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClick(n);
                      }
                    }}>
                    <div className="text-center font-medium">{title}</div>
                    {body ? (
                      <div className="text-muted-foreground mt-0.5 text-start">{body}</div>
                    ) : null}
                    <div className="text-muted-foreground mt-1 text-start text-xs">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </div>
                  </button>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
