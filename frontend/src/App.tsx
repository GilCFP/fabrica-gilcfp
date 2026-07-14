import { Routes, Route } from 'react-router'
import Layout from './components/Layout'
import Home from './pages/Home'
import Roteiros from './pages/Roteiros'
import Inteligencia from './pages/Inteligencia'
import Editor from './pages/Editor'
import Calendario from './pages/Calendario'
import Config from './pages/Config'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/roteiros" element={<Roteiros />} />
        <Route path="/inteligencia" element={<Inteligencia />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/config" element={<Config />} />
      </Route>
    </Routes>
  )
}
