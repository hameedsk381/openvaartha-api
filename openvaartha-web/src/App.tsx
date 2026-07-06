import { useEffect, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import AdminRoute from "./components/AdminRoute.tsx";
import InstallPWA from "./components/InstallPWA.tsx";
import { toast } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary.tsx";

/* ─── Lazy Loaded Pages ──────────────────────────────── */

const Index = lazy(() => import("./pages/Index.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const Register = lazy(() => import("./pages/Register.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const ArticlePage = lazy(() => import("./pages/ArticlePage.tsx"));
const CategoryPage = lazy(() => import("./pages/CategoryPage.tsx"));
const SearchPage = lazy(() => import("./pages/SearchPage.tsx"));
const TrendingPage = lazy(() => import("./pages/TrendingPage.tsx"));
const ExplainersPage = lazy(() => import("./pages/ExplainersPage.tsx"));
const LiveUpdatesPage = lazy(() => import("./pages/LiveUpdatesPage.tsx"));
const AboutPage = lazy(() => import("./pages/AboutPage.tsx"));
const ContactPage = lazy(() => import("./pages/ContactPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Portal Layout & Pages
const PortalLayout = lazy(() => import("./components/PortalLayout.tsx").then(module => ({ default: module.PortalLayout })));
const PortalDashboard = lazy(() => import("./pages/PortalDashboard.tsx"));
const PortalSaved = lazy(() => import("./pages/PortalSaved.tsx"));
const PortalHistory = lazy(() => import("./pages/PortalHistory.tsx"));
const PortalSettings = lazy(() => import("./pages/PortalSettings.tsx"));
const PortalWrite = lazy(() => import("./pages/PortalWrite.tsx"));

// Admin Layout & Pages
const AdminLayout = lazy(() => import("./components/AdminLayout.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminArticles = lazy(() => import("./pages/admin/AdminArticles.tsx"));
const AdminArticleForm = lazy(() => import("./pages/admin/AdminArticleForm.tsx"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories.tsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.tsx"));
const AdminComments = lazy(() => import("./pages/admin/AdminComments.tsx"));
const AdminNewsletter = lazy(() => import("./pages/admin/AdminNewsletter.tsx"));
const AdminSources = lazy(() => import("./pages/admin/AdminSources.tsx"));
const AdminContributions = lazy(() => import("./pages/admin/AdminContributions.tsx"));

/* ─── Premium Loading Screen ─────────────────────────── */

const GlobalLoading = () => (
  <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground animate-fade-in">
    <div className="relative flex items-center justify-center">
      <div className="h-12 w-12 rounded-full border-2 border-primary/20 animate-pulse" />
      <div className="absolute h-8 w-8 rounded-full border-t-2 border-primary animate-spin" />
    </div>
    <span className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Loading OpenVaartha...</span>
  </div>
);

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
      const theme = localStorage.getItem('theme') || 'Light';
      const root = window.document.documentElement;
      
      if (theme === 'Dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
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
          <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md focus:shadow-md focus:font-semibold focus:outline-none">Skip to Content</a>
          <ProtectedRoute>
            <ErrorBoundary>
            <Suspense fallback={<GlobalLoading />}>
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
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                
                {/* Portal Routes */}
                <Route path="/portal" element={<PortalLayout><PortalDashboard /></PortalLayout>} />
                <Route path="/portal/dashboard" element={<PortalLayout><PortalDashboard /></PortalLayout>} />
                <Route path="/portal/saved" element={<PortalLayout><PortalSaved /></PortalLayout>} />
                <Route path="/portal/history" element={<PortalLayout><PortalHistory /></PortalLayout>} />
                <Route path="/portal/settings" element={<PortalLayout><PortalSettings /></PortalLayout>} />
                <Route path="/portal/write" element={<PortalLayout><PortalWrite /></PortalLayout>} />

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminRoute roles={["admin"]}><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
                <Route path="/admin/articles" element={<AdminRoute roles={["admin", "editor"]}><AdminLayout><AdminArticles /></AdminLayout></AdminRoute>} />
                <Route path="/admin/articles/new" element={<AdminRoute roles={["admin", "editor"]}><AdminLayout><AdminArticleForm /></AdminLayout></AdminRoute>} />
                <Route path="/admin/articles/:articleId/edit" element={<AdminRoute roles={["admin", "editor"]}><AdminLayout><AdminArticleForm /></AdminLayout></AdminRoute>} />
                <Route path="/admin/categories" element={<AdminRoute roles={["admin", "editor"]}><AdminLayout><AdminCategories /></AdminLayout></AdminRoute>} />
                <Route path="/admin/users" element={<AdminRoute roles={["admin"]}><AdminLayout><AdminUsers /></AdminLayout></AdminRoute>} />
                <Route path="/admin/comments" element={<AdminRoute roles={["admin", "moderator"]}><AdminLayout><AdminComments /></AdminLayout></AdminRoute>} />
                <Route path="/admin/newsletter" element={<AdminRoute roles={["admin"]}><AdminLayout><AdminNewsletter /></AdminLayout></AdminRoute>} />
                <Route path="/admin/sources" element={<AdminRoute roles={["admin"]}><AdminLayout><AdminSources /></AdminLayout></AdminRoute>} />
                <Route path="/admin/contributions" element={<AdminRoute roles={["admin", "editor"]}><AdminLayout><AdminContributions /></AdminLayout></AdminRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        </BrowserRouter>
        <InstallPWA />
      </div>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
