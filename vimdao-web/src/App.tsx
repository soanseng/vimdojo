import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChallengeList from './components/Challenge/ChallengeList'
import ChallengeView from './components/Challenge/ChallengeView'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChallengeList />} />
        <Route path="/challenge/:id" element={<ChallengeView />} />
      </Routes>
    </BrowserRouter>
  )
}
