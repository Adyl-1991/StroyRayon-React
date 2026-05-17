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
import { ProductPage } from '../pages/ProductPage'
import { SearchPage } from '../pages/SearchPage'
import { EmptyState } from '../components/ui/EmptyState'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <EmptyState title="Барак ачылган жок" text="Башкы бетке кайтып, кайра аракет кылып көрүңүз." />,
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
      { path: 'blog', element: <BlogPage /> },
    ],
  },
])
