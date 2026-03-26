import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Dashboard from './components/Dashboard/Dashboard'
import HomePage from './components/RPG/HomePage'
import ChallengeList from './components/Challenge/ChallengeList'
import ChallengeView from './components/Challenge/ChallengeView'
import CommandRef from './components/CommandRef/CommandRef'
import Library from './components/Library/Library'
import QuizList from './components/Quiz/QuizList'
import QuizView from './components/Quiz/QuizView'
import LandingPage from './components/Landing/LandingPage'
import GuidePage from './components/Guide/GuidePage'
import Navbar from './components/Layout/Navbar'

function AppLayout() {
  const location = useLocation()
  const hideNavbar = location.pathname === '/welcome'

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route
          path="/"
          element={
            localStorage.getItem('vimdojo_visited')
              ? <Dashboard />
              : <Navigate to="/welcome" replace />
          }
        />
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/path" element={<HomePage />} />
        <Route path="/practice" element={<ChallengeList />} />
        <Route path="/challenge/:id" element={<ChallengeView />} />
        <Route path="/commands" element={<CommandRef />} />
        <Route path="/library" element={<Library />} />
        <Route path="/lazyvim" element={<QuizList />} />
        <Route path="/quiz/:id" element={<QuizView />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppLayout />
    </BrowserRouter>
  )
}
