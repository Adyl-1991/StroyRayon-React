import { createBrowserRouter } from 'react-router-dom'
import { App } from './App'
import { BlogPage } from '../pages/BlogPage'
import { CartPage } from '../pages/CartPage'
import { CatalogNodePage } from '../pages/CatalogNodePage'
import { CatalogPage } from '../pages/CatalogPage'
import { CheckoutPage } from '../pages/CheckoutPage'
import { ContactsPage } from '../pages/ContactsPage'
import { DeliveryPage } from '../pages/DeliveryPage'
import { HomePage } from '../pages/HomePage'
import { AboutPage, PaymentPage, PrivacyPage, ReturnPage } from '../pages/InfoPages'
import { ProductPage } from '../pages/ProductPage'
import { SearchPage } from '../pages/SearchPage'
import { RouteError } from '../components/ui/RouteError'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'catalog', element: <CatalogPage /> },
      { path: 'catalog/*', element: <CatalogNodePage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'product/:productSlug', element: <ProductPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'contacts', element: <ContactsPage /> },
      { path: 'delivery', element: <DeliveryPage /> },
      { path: 'payment', element: <PaymentPage /> },
      { path: 'return', element: <ReturnPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'blog', element: <BlogPage /> },
    ],
  },
])
