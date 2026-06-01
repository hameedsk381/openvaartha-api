import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import ArticlePage from "./pages/ArticlePage.tsx";
import CategoryPage from "./pages/CategoryPage.tsx";
import SearchPage from "./pages/SearchPage.tsx";
import TrendingPage from "./pages/TrendingPage.tsx";
import ExplainersPage from "./pages/ExplainersPage.tsx";
import LiveUpdatesPage from "./pages/LiveUpdatesPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import { PortalLayout } from "./components/PortalLayout.tsx";
import PortalDashboard from "./pages/PortalDashboard.tsx";
import PortalSaved from "./pages/PortalSaved.tsx";
import PortalHistory from "./pages/PortalHistory.tsx";
import PortalSettings from "./pages/PortalSettings.tsx";
import AdminRoute from "./components/AdminRoute.tsx";
import AdminLayout from "./components/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminArticles from "./pages/admin/AdminArticles.tsx";
import AdminArticleForm from "./pages/admin/AdminArticleForm.tsx";
import AdminCategories from "./pages/admin/AdminCategories.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminComments from "./pages/admin/AdminComments.tsx";
import AdminNewsletter from "./pages/admin/AdminNewsletter.tsx";
import InstallPWA from "./components/InstallPWA.tsx";
import { toast } from "sonner";


const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Online / offline toast
    const handleOnline = () => toast.success("Back online");
    const handleOffline = () => toast.error("You're offline. Cached stories still available.");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Apply Theme
    const applyTheme = () => {
      const theme = localStorage.getItem('theme') || 'System default';
      const root = window.document.documentElement;
      
      if (theme === 'Dark') {
        root.classList.add('dark');
      } else if (theme === 'Light') {
        root.classList.remove('dark');
      } else {
        // System default
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemDark) root.classList.add('dark');
        else root.classList.remove('dark');
      }
    };

    // Apply Font Size
    const applyFontSize = () => {
      const size = localStorage.getItem('font-size') || 'Medium';
      const root = window.document.documentElement;
      const sizes: Record<string, string> = {
        'Small': '14px',
        'Medium': '16px',
        'Large': '18px'
      };
      root.style.fontSize = sizes[size] || '16px';
    };

    applyTheme();
    applyFontSize();

    const handleUpdate = () => {
      applyTheme();
      applyFontSize();
    };

    // Listen for storage changes (from other tabs)
    window.addEventListener('storage', handleUpdate);
    // Listen for local changes (from same tab)
    window.addEventListener('appearance-change', handleUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('appearance-change', handleUpdate);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="relative min-h-screen overflow-x-hidden bg-background selection:bg-primary/10">
        <BrowserRouter>
          <ProtectedRoute>
            <Routes>
              <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/article/:slug" element={<ArticlePage />} />
            <Route path="/category/:categoryId" element={<CategoryPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/explainers" element={<ExplainersPage />} />
            <Route path="/live" element={<LiveUpdatesPage />} />
            
            {/* Portal Routes */}
            <Route path="/portal" element={<PortalLayout><PortalDashboard /></PortalLayout>} />
            <Route path="/portal/dashboard" element={<PortalLayout><PortalDashboard /></PortalLayout>} />
            <Route path="/portal/saved" element={<PortalLayout><PortalSaved /></PortalLayout>} />
            <Route path="/portal/history" element={<PortalLayout><PortalHistory /></PortalLayout>} />
            <Route path="/portal/settings" element={<PortalLayout><PortalSettings /></PortalLayout>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
            <Route path="/admin/articles" element={<AdminRoute><AdminLayout><AdminArticles /></AdminLayout></AdminRoute>} />
            <Route path="/admin/articles/new" element={<AdminRoute><AdminLayout><AdminArticleForm /></AdminLayout></AdminRoute>} />
            <Route path="/admin/articles/:articleId/edit" element={<AdminRoute><AdminLayout><AdminArticleForm /></AdminLayout></AdminRoute>} />
            <Route path="/admin/categories" element={<AdminRoute><AdminLayout><AdminCategories /></AdminLayout></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminLayout><AdminUsers /></AdminLayout></AdminRoute>} />
            <Route path="/admin/comments" element={<AdminRoute><AdminLayout><AdminComments /></AdminLayout></AdminRoute>} />
            <Route path="/admin/newsletter" element={<AdminRoute><AdminLayout><AdminNewsletter /></AdminLayout></AdminRoute>} />

            <Route path="*" element={<NotFound />} />

            </Routes>
          </ProtectedRoute>
        </BrowserRouter>
        <InstallPWA />
      </div>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
