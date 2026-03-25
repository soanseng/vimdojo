import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard/Dashboard'
import HomePage from './components/RPG/HomePage'
import ChallengeList from './components/Challenge/ChallengeList'
import ChallengeView from './components/Challenge/ChallengeView'
import CommandRef from './components/CommandRef/CommandRef'
import Library from './components/Library/Library'
import Navbar from './components/Layout/Navbar'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/path" element={<HomePage />} />
        <Route path="/practice" element={<ChallengeList />} />
        <Route path="/challenge/:id" element={<ChallengeView />} />
        <Route path="/commands" element={<CommandRef />} />
        <Route path="/library" element={<Library />} />
      </Routes>
    </BrowserRouter>
  )
}
