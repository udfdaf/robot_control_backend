import { Link, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage.tsx';
import AdminPage from './pages/AdminPage.tsx';

export default function App() {
  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <b>RoboOps</b>
        <Link to="/">Dashboard</Link>
        <Link to="/admin">Admin</Link>
      </header>
      <hr />

      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </div>
  );
}
