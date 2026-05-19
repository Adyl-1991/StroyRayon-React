import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router.jsx'
import { CartProvider } from './hooks/useCart.jsx'
import { LocaleProvider } from './i18n/LocaleContext.jsx'
import './styles/variables.css'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LocaleProvider>
      <CartProvider>
        <RouterProvider router={router} />
      </CartProvider>
    </LocaleProvider>
  </StrictMode>,
)
