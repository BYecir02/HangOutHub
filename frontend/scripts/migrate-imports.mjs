/**
 * Migrates all @/hooks/*, @/components/*, @/services/* imports
 * to their new @/shared/hooks/*, @/features/*, @/services/domain/* paths.
 * Run once, then delete stubs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── FULL MAPPING: old @/ path → new @/ path ────────────────────────────────

const REPLACEMENTS = new Map([
  // Hooks
  ['@/hooks/use-app-language', '@/shared/hooks/use-app-language'],
  ['@/hooks/use-color-scheme', '@/shared/hooks/use-color-scheme'],
  ['@/hooks/use-i18n', '@/shared/hooks/use-i18n'],
  ['@/hooks/use-theme-color', '@/shared/hooks/use-theme-color'],
  ['@/hooks/useDiscoverScreen', '@/features/discover/hooks/useDiscoverScreen'],
  ['@/hooks/useEventDetail', '@/features/events/hooks/useEventDetail'],
  ['@/hooks/useHomeScreen', '@/features/user/hooks/useHomeScreen'],
  ['@/hooks/useLocationScope', '@/shared/hooks/useLocationScope'],
  ['@/hooks/useOrganizerGuard', '@/features/organizer/hooks/useOrganizerGuard'],
  ['@/hooks/usePaginatedList', '@/shared/hooks/usePaginatedList'],
  ['@/hooks/usePlaceDetail', '@/features/places/hooks/usePlaceDetail'],
  ['@/hooks/useScannerFlow', '@/features/organizer/hooks/useScannerFlow'],
  ['@/hooks/useScreenAsync', '@/shared/hooks/useScreenAsync'],
  ['@/hooks/useUserProfile', '@/features/user/hooks/useUserProfile'],
  ['@/hooks/useVisibleItemAutoplay', '@/shared/hooks/useVisibleItemAutoplay'],
  ['@/hooks/useVisibleItemAutoplay.logic', '@/shared/hooks/useVisibleItemAutoplay.logic'],

  // Services — flat → domain subdirectory
  ['@/services/admin-analytics', '@/services/organizer/admin-analytics'],
  ['@/services/admin-organizers', '@/services/organizer/admin-organizers'],
  ['@/services/admin-users', '@/services/organizer/admin-users'],
  ['@/services/app-preferences', '@/services/auth/app-preferences'],
  ['@/services/dataCache', '@/services/api/dataCache'],
  ['@/services/direct-chat-meta', '@/services/messaging/direct-chat-meta'],
  ['@/services/direct-chat-realtime', '@/services/messaging/direct-chat-realtime'],
  ['@/services/direct-chats', '@/services/messaging/direct-chats'],
  ['@/services/event-bookings', '@/services/events/event-bookings'],
  ['@/services/event-collaborators', '@/services/events/event-collaborators'],
  ['@/services/event-revisions', '@/services/events/event-revisions'],
  ['@/services/formatters', '@/services/shared/formatters'],
  ['@/services/friendships', '@/services/user/friendships'],
  ['@/services/i18n', '@/services/shared/i18n'],
  ['@/services/location-preferences', '@/services/shared/location-preferences'],
  ['@/services/media-upload', '@/services/shared/media-upload'],
  ['@/services/media', '@/services/shared/media'],
  ['@/services/navigation', '@/services/api/navigation'],
  ['@/services/organizer-access', '@/services/organizer/organizer-access'],
  ['@/services/organizer-analytics', '@/services/organizer/organizer-analytics'],
  ['@/services/organizer-notifications', '@/services/organizer/organizer-notifications'],
  ['@/services/organizer-scanner', '@/services/organizer/organizer-scanner'],
  ['@/services/organizer-ui', '@/services/organizer/organizer-ui'],
  ['@/services/outings', '@/services/messaging/outings'],
  ['@/services/place-claims', '@/services/places/place-claims'],
  ['@/services/place-team', '@/services/places/place-team'],
  ['@/services/post-events', '@/services/social/post-events'],
  ['@/services/post-realtime', '@/services/social/post-realtime'],
  ['@/services/posts', '@/services/social/posts'],
  ['@/services/recommendation-onboarding', '@/services/shared/recommendation-onboarding'],
  ['@/services/reports', '@/services/social/reports'],
  ['@/services/scanner-preferences', '@/services/organizer/scanner-preferences'],
  ['@/services/scanner-status', '@/services/organizer/scanner-status'],
  ['@/services/settings', '@/services/user/settings'],
  ['@/services/ticket-status', '@/services/shared/ticket-status'],
  ['@/services/user-flow-analytics', '@/services/shared/user-flow-analytics'],
  ['@/services/user-session', '@/services/auth/user-session'],

  // Components — subdir/file → features or shared/ui
  ['@/components/admin/', '@/features/organizer/components/'],
  ['@/components/analytics/', '@/features/user/components/'],
  ['@/components/auth/', '@/features/auth/components/'],
  ['@/components/direct-chat/', '@/features/messaging/components/'],
  ['@/components/discover/', '@/features/discover/components/'],
  ['@/components/event/', '@/features/events/components/'],
  ['@/components/forms/', '@/shared/ui/forms/'],
  ['@/components/home/', '@/features/user/components/'],
  ['@/components/messages/', '@/features/messaging/components/'],
  ['@/components/organizer/', '@/features/organizer/components/'],
  ['@/components/place/', '@/features/places/components/'],
  ['@/components/post/', '@/features/social/components/'],
  ['@/components/profile/', '@/features/user/components/'],
  ['@/components/screens/', '@/features/discover/components/'],
  ['@/components/settings/', '@/features/user/components/'],
  ['@/components/social/', '@/features/social/components/'],
  ['@/components/ui/', '@/shared/ui/'],
]);

// Sort longer keys first so more-specific patterns match before shorter ones
const SORTED = [...REPLACEMENTS.entries()].sort((a, b) => b[0].length - a[0].length);

// ─── FILE WALKER ─────────────────────────────────────────────────────────────

function walkDir(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, .expo, scripts themselves
      if (['node_modules', '.expo', '.git', 'scripts'].includes(entry.name)) continue;
      walkDir(full, results);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

const SOURCE_DIRS = ['app', 'features', 'shared', 'context', 'config', 'components', 'hooks', 'services'].map(d => path.join(ROOT, d));

let totalFiles = 0;
let changedFiles = 0;
let totalReplacements = 0;

for (const dir of SOURCE_DIRS) {
  if (!fs.existsSync(dir)) continue;
  const files = walkDir(dir);

  for (const file of files) {
    totalFiles++;
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    let count = 0;

    for (const [oldPath, newPath] of SORTED) {
      // Match in import/require strings: look for the old path inside quotes
      // Use a regex that matches both single and double quotes
      const escaped = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'g');
      const before = content;
      content = content.replace(re, newPath);
      if (content !== before) {
        count += (before.match(re) || []).length;
      }
    }

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      changedFiles++;
      totalReplacements += count;
      const rel = path.relative(ROOT, file);
      console.log(`  ✓ ${rel} (${count} replacement${count !== 1 ? 's' : ''})`);
    }
  }
}

console.log(`\nDone. ${changedFiles}/${totalFiles} files updated, ${totalReplacements} total replacements.`);
