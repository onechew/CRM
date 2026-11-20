import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CrmProvider } from './context/CrmContext';
import { ContactDetailPage } from './pages/ContactDetail';
import { ContactsPage } from './pages/Contacts';
import { SchedulePage } from './pages/Schedule';
import { TemplatesPage } from './pages/Templates';
import { TodayPage } from './pages/Today';

export default function App() {
  return (
    <CrmProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<TodayPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="contacts/:id" element={<ContactDetailPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </CrmProvider>
  );
}

