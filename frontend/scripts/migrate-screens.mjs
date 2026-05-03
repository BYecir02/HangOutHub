/**
 * Phase 3 — complete.
 * Moves all remaining app/ screen content to features/*\/screens/,
 * leaves a 1-line thin wrapper in app/ for Expo Router.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// [appPath, featuresScreenPath]
const MIGRATIONS = [
  // auth
  ['app/index.tsx',                         'features/auth/screens/LoginScreen.tsx'],
  ['app/register.tsx',                      'features/auth/screens/RegisterScreen.tsx'],
  ['app/forgot-password.tsx',               'features/auth/screens/ForgotPasswordScreen.tsx'],
  ['app/reset-password.tsx',                'features/auth/screens/ResetPasswordScreen.tsx'],
  ['app/reset-password-confirm.tsx',        'features/auth/screens/ResetPasswordConfirmScreen.tsx'],
  ['app/verify-email.tsx',                  'features/auth/screens/VerifyEmailScreen.tsx'],

  // user
  ['app/(tabs)/home.tsx',                   'features/user/screens/HomeScreen.tsx'],
  ['app/(tabs)/profile.tsx',                'features/user/screens/ProfileScreen.tsx'],
  ['app/edit-profile.tsx',                  'features/user/screens/EditProfileScreen.tsx'],
  ['app/preferences.tsx',                   'features/user/screens/PreferencesScreen.tsx'],
  ['app/settings.tsx',                      'features/user/screens/SettingsScreen.tsx'],
  ['app/notification-settings.tsx',         'features/user/screens/NotificationSettingsScreen.tsx'],
  ['app/help-support.tsx',                  'features/user/screens/HelpSupportScreen.tsx'],
  ['app/user/[id].tsx',                     'features/user/screens/UserProfileScreen.tsx'],

  // discover
  ['app/(tabs)/explore.tsx',                'features/discover/screens/ExploreScreen.tsx'],
  ['app/(tabs)/map.native.tsx',             'features/discover/screens/MapTabScreen.native.tsx'],
  ['app/(tabs)/map.tsx',                    'features/discover/screens/MapTabScreen.tsx'],
  ['app/(tabs)/map.web.tsx',                'features/discover/screens/MapTabScreen.web.tsx'],
  ['app/discover.tsx',                      'features/discover/screens/DiscoverScreen.tsx'],
  ['app/search.tsx',                        'features/discover/screens/SearchScreen.tsx'],
  ['app/location.tsx',                      'features/discover/screens/LocationScreen.tsx'],
  ['app/categories.tsx',                    'features/discover/screens/CategoriesScreen.tsx'],
  ['app/category/[id].tsx',                 'features/discover/screens/CategoryScreen.tsx'],

  // events
  ['app/events.tsx',                        'features/events/screens/EventsScreen.tsx'],
  ['app/event/[id].tsx',                    'features/events/screens/EventDetailScreen.tsx'],
  ['app/event-booking/[id].tsx',            'features/events/screens/EventBookingScreen.tsx'],
  ['app/my-tickets.tsx',                    'features/events/screens/MyTicketsScreen.tsx'],
  ['app/my-ticket/[id].tsx',               'features/events/screens/MyTicketDetailScreen.tsx'],

  // social
  ['app/(tabs)/social.tsx',                 'features/social/screens/SocialScreen.tsx'],
  ['app/comments.tsx',                      'features/social/screens/CommentsScreen.tsx'],
  ['app/connections.tsx',                   'features/social/screens/ConnectionsScreen.tsx'],
  ['app/friend-requests.tsx',               'features/social/screens/FriendRequestsScreen.tsx'],
  ['app/notifications.tsx',                 'features/social/screens/NotificationsScreen.tsx'],
  ['app/outing-invitations.tsx',            'features/social/screens/OutingInvitationsScreen.tsx'],
  ['app/create-modal.tsx',                  'features/social/screens/CreateModalScreen.tsx'],
  ['app/post-view/[id].tsx',               'features/social/screens/PostViewScreen.tsx'],

  // messaging
  ['app/messages.tsx',                      'features/messaging/screens/MessagesScreen.tsx'],
  ['app/outing.tsx',                        'features/messaging/screens/OutingScreen.tsx'],
  ['app/outing/[id].tsx',                  'features/messaging/screens/OutingDetailScreen.tsx'],
  ['app/outing-chat/[id].tsx',             'features/messaging/screens/OutingChatScreen.tsx'],

  // places
  ['app/places.tsx',                        'features/places/screens/PlacesScreen.tsx'],
  ['app/place/[id].tsx',                   'features/places/screens/PlaceDetailScreen.tsx'],

  // organizer
  ['app/activate-pro.tsx',                  'features/organizer/screens/ActivateProScreen.tsx'],
  ['app/event-scans/[id].tsx',             'features/organizer/screens/EventScansScreen.tsx'],
  ['app/organizer/action-center.tsx',       'features/organizer/screens/ActionCenterScreen.tsx'],
  ['app/organizer/claim-place.tsx',         'features/organizer/screens/ClaimPlaceScreen.tsx'],
  ['app/organizer/create-place.tsx',        'features/organizer/screens/CreatePlaceScreen.tsx'],
  ['app/organizer/dashboard.tsx',           'features/organizer/screens/DashboardScreen.tsx'],
  ['app/organizer/event-revisions.tsx',     'features/organizer/screens/EventRevisionsScreen.tsx'],
  ['app/organizer/event-team.tsx',          'features/organizer/screens/EventTeamScreen.tsx'],
  ['app/organizer/events.tsx',              'features/organizer/screens/OrganizerEventsScreen.tsx'],
  ['app/organizer/notifications.tsx',       'features/organizer/screens/OrganizerNotificationsScreen.tsx'],
  ['app/organizer/place-onboarding.tsx',    'features/organizer/screens/PlaceOnboardingScreen.tsx'],
  ['app/organizer/place-profile/[id].tsx', 'features/organizer/screens/PlaceProfileScreen.tsx'],
  ['app/organizer/place-team.tsx',          'features/organizer/screens/PlaceTeamScreen.tsx'],
  ['app/organizer/places.tsx',              'features/organizer/screens/OrganizerPlacesScreen.tsx'],
  ['app/organizer/profile.tsx',             'features/organizer/screens/OrganizerProfileScreen.tsx'],
  ['app/organizer/scanner.tsx',             'features/organizer/screens/ScannerScreen.tsx'],
  ['app/organizer/settings.tsx',            'features/organizer/screens/OrganizerSettingsScreen.tsx'],
];

let migrated = 0;
let skipped = 0;

for (const [appRel, featRel] of MIGRATIONS) {
  const appAbs  = path.join(ROOT, appRel);
  const featAbs = path.join(ROOT, featRel);

  if (!fs.existsSync(appAbs)) {
    console.log(`SKIP (missing): ${appRel}`);
    skipped++;
    continue;
  }

  const content = fs.readFileSync(appAbs, 'utf8').trim();
  // Already a thin wrapper if content is 1-3 lines and contains 'export'
  if (content.split('\n').length <= 3 && content.includes('export')) {
    console.log(`SKIP (already wrapper): ${appRel}`);
    skipped++;
    continue;
  }

  // Target already exists — don't overwrite
  if (fs.existsSync(featAbs)) {
    console.log(`SKIP (target exists): ${featRel}`);
    skipped++;
    continue;
  }

  // Create target directory
  fs.mkdirSync(path.dirname(featAbs), { recursive: true });

  // Write content to new location
  fs.writeFileSync(featAbs, fs.readFileSync(appAbs, 'utf8'), 'utf8');

  // Build @/ import path for the wrapper (strip .tsx extension)
  const importPath = '@/' + featRel.replace(/\.tsx$/, '');

  // Write thin wrapper
  fs.writeFileSync(appAbs, `export { default } from '${importPath}';\n`, 'utf8');

  console.log(`✓ ${appRel} → ${featRel}`);
  migrated++;
}

console.log(`\nDone. ${migrated} migrated, ${skipped} skipped.`);
