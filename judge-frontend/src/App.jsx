import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import MatchRoomPage from './pages/MatchRoomPage'
import PracticePage from './pages/PracticePage'
import ProfilePage from './pages/ProfilePage'

import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminProblemsPage from './pages/AdminProblemsPage'
import AdminTestCasesPage from './pages/AdminTestCasesPage'
import AdminUsersPage from './pages/AdminUsersPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/problems" element={<AdminProblemsPage />} />
            <Route path="/admin/problems/:id/testcases" element={<AdminTestCasesPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/match/:matchId" element={<MatchRoomPage />} />
            <Route path="/practice/:problemSlug" element={<PracticePage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
