import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import TravelListPage from './pages/TravelListPage'
import TravelPlannerPage from './pages/TravelPlannerPage'

export default function App() {
  return (
    <Routes>
      <Route path="/"            element={<LandingPage />} />
      <Route path="/login"       element={<LoginPage />} />
      <Route path="/register"    element={<RegisterPage />} />
      <Route path="/travels"     element={<TravelListPage />} />
      <Route path="/travels/:id" element={<TravelPlannerPage />} />
      <Route path="*"            element={<Navigate to="/" />} />
    </Routes>
  )
}
