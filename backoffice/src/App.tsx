import { BrowserRouter, Route, Routes } from 'react-router-dom';

import RequireAuth from './components/RequireAuth';
import Shell from './components/Shell';
import ApprovalsPage from './pages/Approvals';
import CategoriesTagsPage from './pages/CategoriesTags';
import Dashboard from './pages/Dashboard';
import EventEditPage from './pages/EventEdit';
import EventsPage from './pages/Events';
import LoginPage from './pages/Login';
import UserFlowPage from './pages/UserFlow';
import PlaceEditPage from './pages/PlaceEdit';
import PlacesPage from './pages/Places';
import PlaceViewPage from './pages/PlaceView';
import ReportsPage from './pages/Reports';
import PostViewPage from './pages/PostView';
import UsersPage from './pages/Users';
import SettingsPage from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="/parcours" element={<UserFlowPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/categories" element={<CategoriesTagsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/new" element={<EventEditPage />} />
            <Route path="/events/:id" element={<EventEditPage />} />
            <Route path="/places" element={<PlacesPage />} />
            <Route path="/places/new" element={<PlaceEditPage />} />
            <Route path="/places/view/:id" element={<PlaceViewPage />} />
            <Route path="/places/:id" element={<PlaceEditPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/posts/:id" element={<PostViewPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

