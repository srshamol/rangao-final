import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { CustomerProvider } from "@/context/CustomerContext";
import CartSidebar from "@/components/CartSidebar";
import FBPixelProvider from "@/components/FBPixelProvider";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import Products from "./pages/Products";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import OrderSuccess from "./pages/OrderSuccess";
import NotFound from "./pages/NotFound";
import CustomerLogin from "./pages/customer/Login";
import CustomerRegister from "./pages/customer/Register";
import ForgotPassword from "./pages/customer/ForgotPassword";
import ResetPassword from "./pages/customer/ResetPassword";
import CustomerDashboard from "./pages/customer/Dashboard";
import CustomerOrders from "./pages/customer/Orders";
import CustomerWishlist from "./pages/customer/Wishlist";
import CustomerProfile from "./pages/customer/Profile";

// Admin
import AdminLogin from "./pages/admin/Login";
import AdminLayout from "./components/admin/AdminLayout";
import ProtectedRoute from "./components/admin/ProtectedRoute";
import Dashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import ProductForm from "./pages/admin/ProductForm";
import AdminCategories from "./pages/admin/Categories";
import AdminOrders from "./pages/admin/Orders";
import OrderDetail from "./pages/admin/OrderDetail";
import AdminInventory from "./pages/admin/Inventory";
import AdminCoupons from "./pages/admin/Coupons";
import AdminSettings from "./pages/admin/Settings";
import AdminFinance from "./pages/admin/Finance";
import AdminCustomers from "./pages/admin/Customers";
import IncompleteOrders from "./pages/admin/IncompleteOrders";
import HomepageManager from "./pages/admin/HomepageManager";
import OrderControl from "./pages/admin/OrderControl";
import AdminTestimonials from "./pages/admin/Testimonials";
import AdminBrands from "./pages/admin/Brands";
import AdminHomepageSEO from "./pages/admin/HomepageSEO";
import SettingsSync from "@/components/SettingsSync";
import StorageInitializer from "@/components/StorageInitializer";
import MediaLibrary from "./pages/admin/MediaLibrary";
import StorageDiagnostics from "./pages/admin/StorageDiagnostics";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
    <CartProvider>
        <CustomerProvider>
          <Toaster />
          <Sonner />
          <SettingsSync />
          <StorageInitializer />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <FBPixelProvider />
            <CartSidebar />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/products" element={<Products />} />
              <Route path="/category/:slug" element={<Products />} />
              <Route path="/order-success/:orderNumber" element={<OrderSuccess />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:id" element={<BlogPost />} />

              {/* Customer Auth & Account */}
              <Route path="/login" element={<CustomerLogin />} />
              <Route path="/register" element={<CustomerRegister />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/account" element={<CustomerDashboard />} />
              <Route path="/account/orders" element={<CustomerOrders />} />
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
                <Route path="customers" element={<AdminCustomers />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="settings/storage-diagnostics" element={<StorageDiagnostics />} />
                <Route path="media-library" element={<MediaLibrary />} />
                <Route path="homepage" element={<HomepageManager />} />
                <Route path="testimonials" element={<AdminTestimonials />} />
                <Route path="brands" element={<AdminBrands />} />
                <Route path="homepage-seo" element={<AdminHomepageSEO />} />
                <Route path="incomplete-orders" element={<IncompleteOrders />} />
                <Route path="order-control" element={<OrderControl />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CustomerProvider>
    </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
