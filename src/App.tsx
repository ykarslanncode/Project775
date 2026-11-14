import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { SignInPage } from '@/pages/auth/sign-in';
import { SignUpPage } from '@/pages/auth/sign-up';
import { ResetPasswordPage } from '@/pages/auth/reset-password';
import { AppLayout } from '@/components/layout/app-layout';
import { CommandCenter } from '@/pages/command-center';
import { TradingJournal } from '@/pages/trading-journal';
import { LearningTracker } from '@/pages/learning-tracker';
import { BusinessLab } from '@/pages/business-lab';
import { EnglishPractice } from '@/pages/english-practice';
import { DailyCheckins } from '@/pages/daily-checkins';
import { WeeklyReviews } from '@/pages/weekly-reviews';
import { Roadmap } from '@/pages/roadmap';
import { SettingsPage } from '@/pages/settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-foreground font-display text-base font-bold text-background animate-pulse">
            775
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/signin" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout>
              <CommandCenter />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/trading"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TradingJournal />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/learning"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LearningTracker />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/business"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BusinessLab />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/english"
        element={
          <ProtectedRoute>
            <AppLayout>
              <EnglishPractice />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/checkins"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DailyCheckins />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/reviews"
        element={
          <ProtectedRoute>
            <AppLayout>
              <WeeklyReviews />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/roadmap"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Roadmap />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
