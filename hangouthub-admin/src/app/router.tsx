import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { EventCreatePage } from '@/features/events/EventCreatePage';
import { EventDetailPage } from '@/features/events/EventDetailPage';
import { EventsPage } from '@/features/events/EventsPage';
import { OrganizersPage } from '@/features/organizers/OrganizersPage';
import { PlaceClaimsPage } from '@/features/place-claims/PlaceClaimsPage';
import { PlaceCreatePage } from '@/features/places/PlaceCreatePage';
import { PlaceDetailPage } from '@/features/places/PlaceDetailPage';
import { PlacesPage } from '@/features/places/PlacesPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { TaxonomyPage } from '@/features/taxonomy/TaxonomyPage';
import { UsersPage } from '@/features/users/UsersPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="organizers" element={<OrganizersPage />} />
          <Route path="place-claims" element={<PlaceClaimsPage />} />
          <Route path="places" element={<PlacesPage />} />
          <Route path="places/new" element={<PlaceCreatePage />} />
          <Route path="places/:id" element={<PlaceDetailPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/new" element={<EventCreatePage />} />
          <Route path="events/:id" element={<EventDetailPage />} />
          <Route path="taxonomy" element={<TaxonomyPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
