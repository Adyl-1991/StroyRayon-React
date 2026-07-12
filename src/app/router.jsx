import { createBrowserRouter, Navigate } from 'react-router-dom'
import { App } from './App'
import { RouteError } from '../components/ui/RouteError'

function lazyNamed(importer, exportName) {
  return async () => {
    const module = await importer()
    return { Component: module[exportName] }
  }
}

export const router = createBrowserRouter([
  {
    path: '/admin/login',
    lazy: lazyNamed(() => import('../admin/AdminLoginPage'), 'AdminLoginPage'),
    errorElement: <RouteError />,
  },
  {
    path: '/admin',
    lazy: lazyNamed(() => import('../admin/AdminProtectedRoute'), 'AdminProtectedRoute'),
    children: [
      {
        lazy: lazyNamed(() => import('../admin/AdminLayout'), 'AdminLayout'),
        children: [
          { index: true, element: <Navigate to="/admin/orders" replace /> },
          { path: 'orders', lazy: lazyNamed(() => import('../admin/AdminOrdersPage'), 'AdminOrdersPage') },
          { path: 'orders/:id', lazy: lazyNamed(() => import('../admin/AdminOrderDetailPage'), 'AdminOrderDetailPage') },
          { path: 'products', lazy: lazyNamed(() => import('../admin/AdminProductsPage'), 'AdminProductsPage') },
          { path: 'products/new', lazy: lazyNamed(() => import('../admin/AdminProductCreatePage'), 'AdminProductCreatePage') },
          { path: 'products/:id', lazy: lazyNamed(() => import('../admin/AdminProductDetailPage'), 'AdminProductDetailPage') },
        ],
      },
    ],
  },
  {
    path: '/',
    element: <App />,
    errorElement: <RouteError />,
    children: [
      { index: true, lazy: lazyNamed(() => import('../pages/HomePage'), 'HomePage') },
      { path: 'catalog', lazy: lazyNamed(() => import('../pages/CatalogPage'), 'CatalogPage') },
      { path: 'catalog/*', lazy: lazyNamed(() => import('../pages/CatalogNodePage'), 'CatalogNodePage') },
      { path: 'search', lazy: lazyNamed(() => import('../pages/SearchPage'), 'SearchPage') },
      { path: 'product/:productSlug', lazy: lazyNamed(() => import('../pages/ProductPage'), 'ProductPage') },
      { path: 'cart', lazy: lazyNamed(() => import('../pages/CartPage'), 'CartPage') },
      { path: 'checkout', lazy: lazyNamed(() => import('../pages/CheckoutPage'), 'CheckoutPage') },
      { path: 'contacts', lazy: lazyNamed(() => import('../pages/ContactsPage'), 'ContactsPage') },
      { path: 'delivery', lazy: lazyNamed(() => import('../pages/DeliveryPage'), 'DeliveryPage') },
      { path: 'payment', lazy: lazyNamed(() => import('../pages/InfoPages'), 'PaymentPage') },
      { path: 'return', lazy: lazyNamed(() => import('../pages/InfoPages'), 'ReturnPage') },
      { path: 'about', lazy: lazyNamed(() => import('../pages/InfoPages'), 'AboutPage') },
      { path: 'privacy', lazy: lazyNamed(() => import('../pages/InfoPages'), 'PrivacyPage') },
      { path: 'blog', lazy: lazyNamed(() => import('../pages/BlogPage'), 'BlogPage') },
    ],
  },
])
