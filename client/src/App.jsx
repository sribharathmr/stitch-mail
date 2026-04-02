import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { EmailProvider } from './context/EmailContext'
import { UIProvider } from './context/UIContext'
import ErrorBoundary from './components/ErrorBoundary'
import AppShell from './components/AppShell'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import InboxPage from './pages/InboxPage'
import MailReaderPage from './pages/MailReaderPage'
import SearchPage from './pages/SearchPage'
import SettingsPage from './pages/SettingsPage'
import InboxZeroPage from './pages/InboxZeroPage'
import AccountsPage from './pages/AccountsPage'
import SubscriptionsPage from './pages/SubscriptionsPage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={
        <PrivateRoute>
          <EmailProvider>
            <AppShell />
          </EmailProvider>
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="/inbox" replace />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="starred" element={<InboxPage folder="starred" />} />
        <Route path="sent" element={<InboxPage folder="sent" />} />
        <Route path="drafts" element={<InboxPage folder="drafts" />} />
        <Route path="spam" element={<InboxPage folder="spam" />} />
        <Route path="trash" element={<InboxPage folder="trash" />} />
        <Route path="archive" element={<InboxPage folder="archive" />} />
        <Route path="mail/:id" element={<MailReaderPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="settings/*" element={<SettingsPage />} />
        <Route path="inbox-zero" element={<InboxZeroPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
      </Route>
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/inbox" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <UIProvider>
            <AppRoutes />
          </UIProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
