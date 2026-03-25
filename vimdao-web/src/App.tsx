import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './components/RPG/HomePage'
import ChallengeList from './components/Challenge/ChallengeList'
import ChallengeView from './components/Challenge/ChallengeView'
import Navbar from './components/Layout/Navbar'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/practice" element={<ChallengeList />} />
        <Route path="/challenge/:id" element={<ChallengeView />} />
      </Routes>
    </BrowserRouter>
  )
}
