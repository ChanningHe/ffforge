import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import TranscodePage from './pages/TranscodePage'
import TasksPage from './pages/TasksPage'
import HistoryPage from './pages/HistoryPage'
import PresetsPage from './pages/PresetsPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="transcode" element={<TranscodePage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="presets" element={<PresetsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App

