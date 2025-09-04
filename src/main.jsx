import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import MaleApp from './MaleApp.jsx'
import ExcelExport from './components/ExcelExport.jsx'

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/female" replace /> },
  { path: '/female', element: <App /> },
  { path: '/male', element: <MaleApp /> },
  { path: '/excel', element: <ExcelExport /> },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
