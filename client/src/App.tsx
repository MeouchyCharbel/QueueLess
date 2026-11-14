import { lazy } from 'react'
import { Route, Routes } from 'react-router'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import SearchPage from './pages/SearchPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import NotFoundPage from './pages/NotFoundPage'

// Code splitting: pages most visitors don't open first are downloaded only
// when someone opens them, so the search page loads less JavaScript.
// (Layout shows "Loading…" through <Suspense> while a page downloads.)
const BusinessPage = lazy(() => import('./pages/BusinessPage'))
const MyAppointmentsPage = lazy(() => import('./pages/MyAppointmentsPage'))
const OwnerDashboardPage = lazy(() => import('./pages/OwnerDashboardPage'))
const OwnerSetupPage = lazy(() => import('./pages/OwnerSetupPage'))

// Every screen of the app (see docs/wireframes.md). Layout draws the header
// and footer around whichever page matches the URL.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public */}
        <Route index element={<SearchPage />} />
        <Route path="businesses/:id" element={<BusinessPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />

        {/* Customers only */}
        <Route
          path="appointments"
          element={
            <RequireAuth role="CUSTOMER">
              <MyAppointmentsPage />
            </RequireAuth>
          }
        />

        {/* Business owners only */}
        <Route
          path="owner"
          element={
            <RequireAuth role="OWNER">
              <OwnerDashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="owner/setup"
          element={
            <RequireAuth role="OWNER">
              <OwnerSetupPage />
            </RequireAuth>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
