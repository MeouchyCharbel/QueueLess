import { Route, Routes } from 'react-router'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import SearchPage from './pages/SearchPage'
import BusinessPage from './pages/BusinessPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import MyAppointmentsPage from './pages/MyAppointmentsPage'
import OwnerDashboardPage from './pages/OwnerDashboardPage'
import OwnerSetupPage from './pages/OwnerSetupPage'
import NotFoundPage from './pages/NotFoundPage'

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
