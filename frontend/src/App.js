import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import AuthPage from './pages/AuthPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Dashboard from './pages/Dashboard';
import WarmupPage from './pages/WarmupPage';
import DomainsPage from './pages/DomainsPage';
import SendingAccountsPage from './pages/SendingAccountsPage';
import ContactsPage from './pages/ContactsPage';
import CampaignsPage from './pages/CampaignsPage';
import SequencesPage from './pages/SequencesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import DeliverabilityPage from './pages/DeliverabilityPage';
import SuppressionPage from './pages/SuppressionPage';
import UpgradePage from './pages/UpgradePage';
import Layout from './components/Layout';
import { Toaster } from './components/ui/sonner';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          setUser(res.data);
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={!user ? <AuthPage setUser={setUser} /> : <Navigate to="/" />} />
          <Route
            path="/"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Dashboard user={user} />
                </Layout>
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
          <Route
            path="/warmup"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <WarmupPage user={user} />
                </Layout>
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
          <Route
            path="/domains"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <DomainsPage user={user} />
                </Layout>
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
          <Route
            path="/sending-accounts"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <SendingAccountsPage user={user} />
                </Layout>
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
          <Route
            path="/contacts"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <ContactsPage user={user} />
                </Layout>
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
          <Route
            path="/campaigns"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <CampaignsPage user={user} />
                </Layout>
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
          <Route
            path="/sequences"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <SequencesPage user={user} />
                </Layout>
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
          <Route
            path="/analytics"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <AnalyticsPage user={user} />
                </Layout>
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
          <Route
            path="/deliverability"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <DeliverabilityPage user={user} />
                </Layout>
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
          <Route
            path="/suppression"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <SuppressionPage user={user} />
                </Layout>
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
          <Route
            path="/upgrade"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <UpgradePage user={user} />
                </Layout>
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
