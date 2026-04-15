import React, { useCallback, useMemo, useState } from 'react';
import { Tabs, useFocusEffect, useRootNavigationState, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { PlatformPressable } from '@react-navigation/elements';

import { HapticTab } from '@/components/haptic-tab';
import BottomSheetModal from '@/components/ui/BottomSheetModal';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import {
  canAccessOrganizerCapability,
  type OrganizerAccessUser,
  type OrganizerCapability,
  getHighestTeamWorkspaceRole,
  normalizeTeamWorkspaceRole,
} from '@/services/organizer-access';
import { fetchOrganizerNotificationsUnreadCount } from '@/services/organizer-notifications';
import { listMyPlaceTeams } from '@/services/place-team';
import {
  clearStoredUserSession,
  patchStoredUserSession,
  resolveStoredUserSession,
} from '@/services/user-session';
import { clearAuthState } from '@/services/api';
import { safeReplace } from '@/services/navigation';

interface ActionItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  path: string;
}

export default function OrganizerLayout() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const isNavigationReady = Boolean(rootNavigationState?.key);
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  const [accessUser, setAccessUser] = useState<OrganizerAccessUser | null>(null);
  const [actionCenterOpen, setActionCenterOpen] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await fetchOrganizerNotificationsUnreadCount();
      setNotificationsUnread(count);
    } catch {
      setNotificationsUnread(0);
    }
  }, []);

  const hydrateAccessUser = useCallback(async () => {
    if (!isNavigationReady) {
      return;
    }

    const session = await resolveStoredUserSession();
    if (!session) {
      await clearAuthState();
      await clearStoredUserSession();
      safeReplace('/');
      setAccessUser(null);
      return;
    }

    let teamRole = session.teamRole || null;
    try {
      const teams = await listMyPlaceTeams();
      teamRole = getHighestTeamWorkspaceRole(teams.map((team) => team.role));
      await patchStoredUserSession({
        teamRole: teamRole || undefined,
      });
    } catch {
      // no-op
    }

    setAccessUser({
      role: session.role || null,
      hasPlace: session.hasPlace ?? null,
      organizerStatus: session.organizerStatus || null,
      teamRole,
    });
  }, [isNavigationReady, router]);

  const canAccessTab = useCallback(
    (capability: OrganizerCapability) =>
      canAccessOrganizerCapability(accessUser, capability),
    [accessUser],
  );
  const normalizedTeamRole = normalizeTeamWorkspaceRole(accessUser?.teamRole);
  const isManagerWorkspace = normalizedTeamRole === 'MANAGER';
  const isStaffWorkspace = normalizedTeamRole === 'STAFF';
  const isScannerWorkspace = normalizedTeamRole === 'SCANNER';
  const isPlaceOwnerPrimaryWorkspace =
    accessUser?.role === 'PLACE_OWNER' && !normalizedTeamRole;

  const showScanner = useMemo(
    () =>
      isScannerWorkspace ||
      isStaffWorkspace ||
      isManagerWorkspace ||
      (!normalizedTeamRole && canAccessTab('scanner')),
    [
      canAccessTab,
      isManagerWorkspace,
      isScannerWorkspace,
      isStaffWorkspace,
      normalizedTeamRole,
    ],
  );
  const showEvents = useMemo(
    () =>
      !isScannerWorkspace &&
      !isPlaceOwnerPrimaryWorkspace &&
      canAccessTab('events'),
    [canAccessTab, isPlaceOwnerPrimaryWorkspace, isScannerWorkspace],
  );
  const showDashboard = useMemo(
    () => !isScannerWorkspace && !isStaffWorkspace && canAccessTab('dashboard'),
    [canAccessTab, isScannerWorkspace, isStaffWorkspace],
  );
  const showProfile = useMemo(() => canAccessTab('profile'), [canAccessTab]);
  const showNotifications = useMemo(
    () => !isScannerWorkspace && canAccessTab('notifications'),
    [canAccessTab, isScannerWorkspace],
  );
  const showSettings = useMemo(() => canAccessTab('settings'), [canAccessTab]);
  const showActionCenter = useMemo(
    () =>
      !isScannerWorkspace &&
      !isStaffWorkspace &&
      !isManagerWorkspace &&
      canAccessTab('actionCenter'),
    [canAccessTab, isManagerWorkspace, isScannerWorkspace, isStaffWorkspace],
  );

  useFocusEffect(
    useCallback(() => {
      if (!isNavigationReady) {
        return;
      }

      void hydrateAccessUser();
      if (showNotifications) {
        void loadUnreadCount();
      } else {
        setNotificationsUnread(0);
      }

      const timer = setInterval(() => {
        if (showNotifications) {
          void loadUnreadCount();
        }
      }, 30000);

      return () => {
        clearInterval(timer);
      };
    }, [hydrateAccessUser, isNavigationReady, loadUnreadCount, showNotifications]),
  );

  const actionItems = useMemo(() => {
    const items: ActionItem[] = [];

    if (canAccessTab('events')) {
      items.push({
        id: 'manage-events',
        label: t('organizerActionCenterManageEvents'),
        icon: 'calendar-outline',
        color: '#4c669f',
        path: '/organizer/events',
      });
    }

    if (canAccessTab('places')) {
      items.push({
        id: 'manage-places',
        label: t('organizerActionCenterManagePlaces'),
        icon: 'business-outline',
        color: '#2ecc71',
        path: '/organizer/places',
      });
    }

    if (canAccessTab('scanner')) {
      items.push({
        id: 'scanner',
        label: t('organizerActionCenterScanner'),
        icon: 'scan-outline',
        color: '#ff9f1a',
        path: '/organizer/scanner',
      });
    }

    return items;
  }, [canAccessTab, t]);

  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#4c669f',
          tabBarInactiveTintColor: isDark ? '#9ca3af' : '#6b7280',
          tabBarStyle: {
            borderTopWidth: 0,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            backgroundColor: isDark ? '#111827' : '#ffffff',
            height: 86,
            paddingBottom: 18,
            paddingTop: 8,
          },
        }}
      >
        <Tabs.Screen
          name="scanner"
          options={{
            title: t('organizerNavScanner'),
            tabBarButton: (props) => (showScanner ? <HapticTab {...props} /> : null),
            tabBarItemStyle: isScannerWorkspace && showScanner
              ? { flex: 1 }
              : showScanner
                ? undefined
                : { display: 'none' },
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'scan' : 'scan-outline'}
                size={20}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: t('organizerNavEvents'),
            tabBarButton: (props) => (showEvents ? <HapticTab {...props} /> : null),
            tabBarItemStyle: showEvents
              ? undefined
              : { display: 'none' },
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={20}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: t('organizerNavDashboard'),
            tabBarButton: (props) => (showDashboard ? <HapticTab {...props} /> : null),
            tabBarItemStyle: showDashboard
              ? undefined
              : { display: 'none' },
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'grid' : 'grid-outline'}
                size={20}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="action-center"
          options={{
            title: '',
            tabBarLabel: '',
            tabBarItemStyle: showActionCenter
              ? undefined
              : { display: 'none' },
            tabBarButton: (props) =>
              showActionCenter ? (
                <PlatformPressable
                  {...props}
                  onPress={() => setActionCenterOpen(true)}
                  style={[
                    props.style,
                    {
                      alignItems: 'center',
                      alignSelf: 'center',
                      justifyContent: 'center',
                    },
                  ]}
                >
                  <View
                    className="h-14 w-14 items-center justify-center rounded-full bg-[#4c669f]"
                    style={{
                      marginBottom: 20,
                      shadowColor: '#4c669f',
                      shadowOpacity: 0.32,
                      shadowOffset: { width: 0, height: 8 },
                      shadowRadius: 12,
                      elevation: 8,
                    }}
                  >
                    <Ionicons name="add" size={35} color="#FFFFFF" />
                  </View>
                </PlatformPressable>
              ) : null,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('organizerNavProfile'),
            tabBarButton: (props) => (showProfile ? <HapticTab {...props} /> : null),
            tabBarItemStyle: isScannerWorkspace
              ? { flex: 1 }
              : showProfile
                ? undefined
                : { display: 'none' },
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'business' : 'business-outline'}
                size={20}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: t('organizerNavNotifications'),
            tabBarButton: (props) =>
              showNotifications ? <HapticTab {...props} /> : null,
            tabBarItemStyle: showNotifications
              ? undefined
              : { display: 'none' },
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'notifications' : 'notifications-outline'}
                size={20}
                color={color}
              />
            ),
            tabBarBadge: notificationsUnread > 0 ? notificationsUnread : undefined,
            tabBarBadgeStyle: {
              backgroundColor: '#ff4757',
              color: 'white',
              fontSize: 10,
              fontWeight: '700',
            },
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('organizerNavSettings'),
            tabBarButton: (props) =>
              showSettings && isScannerWorkspace ? <HapticTab {...props} /> : null,
            tabBarItemStyle: isScannerWorkspace
              ? { flex: 1 }
              : showSettings && isScannerWorkspace
                ? undefined
                : { display: 'none' },
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'settings' : 'settings-outline'}
                size={20}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen name="places" options={{ href: null }} />
        <Tabs.Screen name="create-place" options={{ href: null }} />
        <Tabs.Screen name="place-onboarding" options={{ href: null }} />
        <Tabs.Screen name="claim-place" options={{ href: null }} />
        <Tabs.Screen name="event-team" options={{ href: null }} />
        <Tabs.Screen name="event-revisions" options={{ href: null }} />
        <Tabs.Screen name="place-team" options={{ href: null }} />
        <Tabs.Screen name="place-profile/[id]" options={{ href: null }} />
      </Tabs>

      <BottomSheetModal
        visible={actionCenterOpen}
        onClose={() => setActionCenterOpen(false)}
        title={t('organizerActionCenterTitle')}
        subtitle={t('organizerActionCenterSubtitle')}
        maxHeight={560}
        contentMode="auto"
        footer={
          <TouchableOpacity
            onPress={() => setActionCenterOpen(false)}
            className="items-center rounded-2xl border border-gray-200 py-3 dark:border-gray-700"
          >
            <Text className="font-semibold text-gray-600 dark:text-gray-300">
              {t('genericCancel')}
            </Text>
          </TouchableOpacity>
        }
      >
        <View>
          {actionItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                setActionCenterOpen(false);
                router.push(item.path as never);
              }}
              className="mb-3 flex-row items-center rounded-3xl bg-gray-50 p-4 dark:bg-gray-800"
              style={{ borderWidth: 1, borderColor: `${item.color}2A` }}
            >
              <View
                className="mr-4 h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${item.color}18` }}
              >
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <View className="flex-1 pr-3">
                <Text className="text-base font-bold text-gray-800 dark:text-white">
                  {item.label}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheetModal>
    </View>
  );
}
