import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LobbyPage from './pages/LobbyPage'
import MatchRoomPage from './pages/MatchRoomPage'
import ProfilePage from './pages/ProfilePage'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/match/:matchId" element={<MatchRoomPage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
