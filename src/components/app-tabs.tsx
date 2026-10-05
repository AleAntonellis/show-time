import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';

import { Brand, Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import {
  getUnseenBadgeCount,
  markMyBadgesSeen,
  subscribeToBadgeUnlocks,
} from '@/services/badges';

export default function AppTabs() {
  const colors = Colors.dark;
  const pathname = usePathname();
  const { configured, session } = useAuth();
  const [badgeUnreadCount, setBadgeUnreadCount] = useState(0);

  useEffect(() => {
    if (!configured || !session) {
      return;
    }
    let cancelled = false;
    const request =
      pathname === '/badges'
        ? markMyBadgesSeen().then(() => 0)
        : getUnseenBadgeCount();
    request
      .then((count) => {
        if (!cancelled) {
          setBadgeUnreadCount(count);
        }
      })
      .catch((error: unknown) => {
        console.error(
          'Badge count unavailable:',
          error instanceof Error ? error.message : error,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [configured, pathname, session]);

  useEffect(
    () =>
      subscribeToBadgeUnlocks((count) => {
        setBadgeUnreadCount((current) =>
          pathname === '/badges' ? 0 : current + count,
        );
      }),
    [pathname],
  );

  return (
    <NativeTabs
      backgroundColor={colors.background}
      badgeBackgroundColor={Brand.softViolet}
      badgeTextColor={Brand.pureWhite}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>Cerca</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Label>Libreria</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Label>Statistiche</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="badges">
        <NativeTabs.Trigger.Label>Sala trofei</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
        <NativeTabs.Trigger.Badge hidden={badgeUnreadCount === 0}>
          {badgeUnreadCount > 99 ? '99+' : String(badgeUnreadCount)}
        </NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="reminders">
        <NativeTabs.Trigger.Label>Reminder</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="diary">
        <NativeTabs.Trigger.Label>Diario</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendario</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="contacts">
        <NativeTabs.Trigger.Label>Contatti</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="inbox">
        <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Impostazioni</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
