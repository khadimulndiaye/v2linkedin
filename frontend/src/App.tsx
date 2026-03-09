import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Campaigns from './pages/Campaigns';
import Leads from './pages/Leads';
import Posts from './pages/Posts';
import AIContent from './pages/AIContent';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/dashboard"  element={<Dashboard />} />
                  <Route path="/accounts"   element={<Accounts />} />
                  <Route path="/campaigns"  element={<Campaigns />} />
                  <Route path="/leads"      element={<Leads />} />
                  <Route path="/posts"      element={<Posts />} />
                  <Route path="/ai-content" element={<AIContent />} />
                  <Route path="/"           element={<Navigate to="/dashboard" replace />} />
                  <Route path="*"           element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
