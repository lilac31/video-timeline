import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import MediaSelector from './pages/MediaSelector'
import Timeline from './pages/Timeline'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/select" element={<MediaSelector />} />
        <Route path="/timeline" element={<Timeline />} />
      </Routes>
    </Router>
  )
}

export default App
