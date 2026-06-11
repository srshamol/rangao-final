import { lazy, Suspense, useEffect } from "react";
import PageSkeleton from "@/components/PageSkeleton";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { CustomerProvider } from "@/context/CustomerContext";
import CartSidebar from "@/components/CartSidebar";
import TrackingProvider from "@/components/TrackingProvider";
import SettingsSync from "@/components/SettingsSync";
import StorageInitializer from "@/components/StorageInitializer";

// Reset window scroll position on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as any });
  }, [pathname]);
  return null;
};

// Lazy Pages
const Index = lazy(() => import("./pages/Index"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Products = lazy(() => import("./pages/Products"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const About = lazy(() => import("./pages/About"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Customer Lazy Pages
const CustomerLogin = lazy(() => import("./pages/customer/Login"));
const CustomerRegister = lazy(() => import("./pages/customer/Register"));
const ForgotPassword = lazy(() => import("./pages/customer/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/customer/ResetPassword"));
const CustomerDashboard = lazy(() => import("./pages/customer/Dashboard"));
const CustomerOrders = lazy(() => import("./pages/customer/Orders"));
const CustomerWishlist = lazy(() => import("./pages/customer/Wishlist"));
const CustomerProfile = lazy(() => import("./pages/customer/Profile"));
const CustomerOrderDetail = lazy(() => import("./pages/customer/OrderDetail"));

// Admin Statically-Imported Layout / Wrapper (for fast transitions)
import AdminLayout from "./components/admin/AdminLayout";
import ProtectedRoute from "./components/admin/ProtectedRoute";

// Admin Lazy Pages
const AdminLogin = lazy(() => import("./pages/admin/Login"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminUsers = lazy(() => import("./pages/admin/User"));
const AdminStaff = lazy(() => import("./pages/admin/Staff"));
const ProductForm = lazy(() => import("./pages/admin/ProductForm"));
const AdminCategories = lazy(() => import("./pages/admin/Categories"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const OrderDetail = lazy(() => import("./pages/admin/OrderDetail"));
const AdminInventory = lazy(() => import("./pages/admin/Inventory"));
const AdminCoupons = lazy(() => import("./pages/admin/Coupons"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminFinance = lazy(() => import("./pages/admin/Finance"));
const IncompleteOrders = lazy(() => import("./pages/admin/IncompleteOrders"));
const HomepageManager = lazy(() => import("./pages/admin/HomepageManager"));
const OrderControl = lazy(() => import("./pages/admin/OrderControl"));
const AdminTestimonials = lazy(() => import("./pages/admin/Testimonials"));
const AdminBrands = lazy(() => import("./pages/admin/Brands"));
const AdminHomepageSEO = lazy(() => import("./pages/admin/HomepageSEO"));
const MediaLibrary = lazy(() => import("./pages/admin/MediaLibrary"));
const StorageDiagnostics = lazy(() => import("./pages/admin/StorageDiagnostics"));
const BlogManager = lazy(() => import("./pages/admin/BlogManager"));
const AdminProfile = lazy(() => import("./pages/admin/Profile"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      gcTime: 1000 * 60 * 5, // 5 minutes
      refetchOnMount: true,
      refetchOnWindowFocus: false, // disable aggressive refetching on window focus
    },
  },
});

import CookieConsent from "@/components/CookieConsent";
import CustomerRealtime from "@/components/CustomerRealtime";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
    <CartProvider>
        <CustomerProvider>
          <Toaster />
          <Sonner />
          <SettingsSync />
          <CustomerRealtime />
          <StorageInitializer />
          <CookieConsent />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollToTop />
            <TrackingProvider />
            <CartSidebar />
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/:categorySlug/:productSlug" element={<ProductDetail />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/products" element={<Products />} />
                <Route path="/category/:slug" element={<Products />} />
                <Route path="/order-success/:orderNumber" element={<OrderSuccess />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:id" element={<BlogPost />} />
                <Route path="/about" element={<About />} />

                {/* Customer Auth & Account */}
                <Route path="/login" element={<CustomerLogin />} />
                <Route path="/register" element={<CustomerRegister />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/account" element={<CustomerDashboard />} />
                <Route path="/account/orders" element={<CustomerOrders />} />
                <Route path="/account/orders/:id" element={<CustomerOrderDetail />} />
                <Route path="/account/wishlist" element={<CustomerWishlist />} />
                <Route path="/account/profile" element={<CustomerProfile />} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="products/new" element={<ProductForm />} />
                  <Route path="products/:id" element={<ProductForm />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="orders/:id" element={<OrderDetail />} />
                  <Route path="inventory" element={<AdminInventory />} />
                  <Route path="coupons" element={<AdminCoupons />} />
                  <Route path="finance" element={<AdminFinance />} />
                  <Route path="customers" element={<AdminUsers />} />
                  <Route path="staff" element={<AdminStaff />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="settings/storage-diagnostics" element={<StorageDiagnostics />} />
                  <Route path="media-library" element={<MediaLibrary />} />
                  <Route path="homepage" element={<HomepageManager />} />
                  <Route path="testimonials" element={<AdminTestimonials />} />
                  <Route path="brands" element={<AdminBrands />} />
                  <Route path="homepage-seo" element={<AdminHomepageSEO />} />
                  <Route path="blog" element={<BlogManager />} />
                  <Route path="incomplete-orders" element={<IncompleteOrders />} />
                  <Route path="order-control" element={<OrderControl />} />
                  <Route path="profile" element={<AdminProfile />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </CustomerProvider>
    </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
