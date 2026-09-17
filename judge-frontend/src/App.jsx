import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// New Landing & Learning Pages
import HomeLandingPage from './pages/HomeLandingPage'
import FundamentalsPage from './pages/FundamentalsPage'
import SystemDesignPage from './pages/SystemDesignPage'
import ResourcesPage from './pages/ResourcesPage'
import StoriesPage from './pages/StoriesPage'

// DSA DSA DSA
import DsaRoadmapPage from './pages/DsaRoadmapPage'
import DsaProblemPage from './pages/DsaProblemPage'
import DsaDashboardPage from './pages/DsaDashboardPage'

// Old Dashboard & Problem Solving Pages
import DashboardPage from './pages/DashboardPage'
import MatchRoomPage from './pages/MatchRoomPage'
import PracticePage from './pages/PracticePage'
import ProfilePage from './pages/ProfilePage'

// Admin Pages
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminProblemsPage from './pages/AdminProblemsPage'
import AdminTestCasesPage from './pages/AdminTestCasesPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminFundamentalsPage from './pages/AdminFundamentalsPage'
import SubjectLearningPage from './pages/SubjectLearningPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route element={<ProtectedRoute />}>
            {/* New Routes */}
            <Route path="/" element={<HomeLandingPage />} />
            <Route path="/fundamentals" element={<FundamentalsPage />} />
            <Route path="/fundamentals/:subjectSlug" element={<SubjectLearningPage />} />
            <Route path="/system-design" element={<SystemDesignPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/stories" element={<StoriesPage />} />
            
            {/* DSA Routes */}
            <Route path="/dsa" element={<DashboardPage />} />
            <Route path="/dsa/problems" element={<DsaRoadmapPage />} />
            <Route path="/dsa/problems/:slug" element={<DsaProblemPage />} />
            <Route path="/dsa/dashboard" element={<DsaDashboardPage />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/fundamentals" element={<AdminFundamentalsPage />} />
            <Route path="/admin/problems" element={<AdminProblemsPage />} />
            <Route path="/admin/problems/:id/testcases" element={<AdminTestCasesPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            
            {/* Operational Routes */}
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
