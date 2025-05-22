import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { auth, db } from './lib/firebase';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useStore } from './lib/store';
import { UserProvider } from './context/UserContext';
import { DietProvider } from './context/DietContext';
import { GoalsProvider } from './context/GoalsContext';
import { ImageProvider } from './context/ImageContext';
import { ToastProvider } from './hooks/useToast';
import { ConfirmationProvider } from './hooks/useConfirmation';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import { ErrorProvider } from './context/ErrorContext';
import Tutorial from './components/Tutorial';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Diet from './pages/Diet';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import { resetDailyStats } from './utils/dailyReset';
import type { UserProfile } from './types/user';
import NetworkStatus from './components/NetworkStatus';
import { ErrorFallback } from './components/common/ErrorFallback'; 
import { reportError } from './utils/errorReporting';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000 // 5 minutes
    },
    mutations: {
      retry: 1
    }
  }
});

function App() {
  const [isReady, setIsReady] = useState(false);
  const { setUser, user } = useStore();
  const [showTutorial, setShowTutorial] = useState<boolean | null>(null);
  const [networkError, setNetworkError] = useState<Error | null>(null);
  
  // Define setVH function to be used in multiple useEffect hooks
  const setVH = () => {
    // Fix for iOS 16+ viewport height
    const height = Math.min(window.innerHeight, document.documentElement.clientHeight);
    document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
  };

  // Handle mobile viewport height
  // This is important for mobile devices
  useEffect(() => {
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    // Fix for iOS keyboard
    window.visualViewport?.addEventListener('resize', setVH);
    
    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
      window.visualViewport?.removeEventListener('resize', setVH);
    };
  }, []);

  // COMENTANDO useEffect que previne double-tap zoom
  /*
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);
  */

  // COMENTANDO useEffect que previne pull-to-refresh
  /*
  useEffect(() => {
    const preventPullToRefresh = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const isAtTop = window.scrollY <= 0;
      
      if (isAtTop && touchY > 0) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventPullToRefresh, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', preventPullToRefresh);
    };
  }, []);
  */

  // Add network error handler
  useEffect(() => {
    const handleNetworkError = (event: ErrorEvent) => {
      // Check if it's a network-related error
      if (event.error instanceof TypeError && 
          (event.error.message.includes('fetch') || 
           event.error.message.includes('network') ||
           event.error.message.includes('connection'))) {
        console.warn('Network error detected:', event.error);
        setNetworkError(event.error);
      }
    };

    // Listen for network errors
    window.addEventListener('error', handleNetworkError);
    
    return () => {
      window.removeEventListener('error', handleNetworkError);
    };
  }, []);

  // Global error handler
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      // Skip Firestore offline errors
      if (event.error && 
          event.error.message && 
          (event.error.message.includes('offline') || 
           event.error.message.includes('client is offline'))) {
        console.warn('Ignoring Firestore offline error:', event.error.message);
        event.preventDefault();
        return;
      }
      
      // Skip Firestore internal assertion errors
      if (event.error && 
          event.error.message && 
          event.error.message.includes('INTERNAL ASSERTION FAILED')) {
        console.warn('Ignoring Firestore internal assertion error:', event.error.message);
        event.preventDefault();
        return;
      }
      
      console.error('Global unhandled error:', event);
      reportError(event.error, {
        context: 'Global unhandled error',
        severity: 'critical'
      });
      // Prevent default browser error handling
      event.preventDefault();
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      // Skip Firestore offline errors
      if (event.reason && 
          event.reason.message && 
          (event.reason.message.includes('offline') || 
           event.reason.message.includes('client is offline'))) {
        console.warn('Ignoring Firestore offline error in promise:', event.reason.message);
        event.preventDefault();
        return;
      }
      
      // Skip Firestore internal assertion errors
      if (event.reason && 
          event.reason.message && 
          event.reason.message.includes('INTERNAL ASSERTION FAILED')) {
        console.warn('Ignoring Firestore internal assertion error in promise:', event.reason.message);
        event.preventDefault();
        return;
      }
      
      console.error('Unhandled promise rejection:', event);
      reportError(event.reason, {
        context: 'Unhandled promise rejection',
        severity: 'critical'
      });
      // Prevent default browser error handling
      event.preventDefault();
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // Auth state and user data loading
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setIsReady(true);
        setShowTutorial(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setShowTutorial(userData.completedOnboarding && (userData.showTutorial ?? false));

          // Set up daily reset after confirming user data
          const now = new Date();
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          
          const timeUntilMidnight = tomorrow.getTime() - now.getTime();

          // Check if we need to reset now
          const lastCheckInString = userData?.dailyStreak?.lastCheckIn;
          if (lastCheckInString) {
            const now = new Date();
            let lastCheckDate: Date;
            try {
              lastCheckDate = new Date(lastCheckInString);
              if (isNaN(lastCheckDate.getTime())) {
                console.warn('Invalid lastCheckIn date, using current date');
                lastCheckDate = new Date();
              }
            } catch (error) {
              console.warn('Error parsing lastCheckIn date:', error);
              lastCheckDate = new Date();
            }
            
            if (lastCheckDate.getDate() !== now.getDate() ||
                lastCheckDate.getMonth() !== now.getMonth() ||
                lastCheckDate.getFullYear() !== now.getFullYear()) {
              console.log('Triggering daily reset and streak update (resetDailyStats commented)');
              
              const yesterday = new Date(now);
              yesterday.setDate(yesterday.getDate() - 1);
              
              const currentStreak = userData?.dailyStreak?.currentStreak || 0;
              const streak = lastCheckDate.getDate() === yesterday.getDate() && 
                             lastCheckDate.getMonth() === yesterday.getMonth() && 
                             lastCheckDate.getFullYear() === yesterday.getFullYear() ? 
                currentStreak + 1 : 1;

              const newDailyStreak = { 
                ...(userData.dailyStreak || {}),
                lastCheckIn: new Date().toISOString(),
                currentStreak: streak,
                longestStreak: Math.max(userData?.dailyStreak?.longestStreak || 0, streak),
                totalCheckIns: (userData?.dailyStreak?.totalCheckIns || 0) + 1
              };

              await updateDoc(doc(db, 'users', user.uid), {
                dailyStreak: newDailyStreak,
                updatedAt: new Date().toISOString(),
                lastDietReset: new Date().toISOString()
              });
            }
          }

          // Schedule next reset at midnight
          const resetTimer = setTimeout(async () => {
            try {
              await resetDailyStats(user.uid);
              // Set up daily interval after first reset
              setInterval(async () => {
                if (auth.currentUser) {
                  await resetDailyStats(auth.currentUser.uid);
                }
              }, 24 * 60 * 60 * 1000);
            } catch (error) {
              console.error('Error in scheduled reset:', error);
            }
          }, timeUntilMidnight);

          return () => clearTimeout(resetTimer);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsReady(true);
      }
    });

    return () => unsubscribe();
  }, [setUser]);

  // Reset network error when online
  useEffect(() => {
    const handleOnline = () => {
      setNetworkError(null);
    };
    
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Function to restart tutorial
  const handleRestartTutorial = async () => {
    if (!auth.currentUser) return;
    
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        showTutorial: true,
        updatedAt: new Date().toISOString()
      });
      setShowTutorial(true);
    } catch (error) {
      console.error('Error restarting tutorial:', error);
    }
  };

  // Show loading spinner while initializing
  if (!isReady) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show network error fallback if persistent network issues
  if (networkError) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-4">
        <ErrorFallback
          error={new Error("Erro de conexão. Verifique sua internet e tente novamente.")}
          resetErrorBoundary={() => window.location.reload()}
          isNetworkError={true}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={<ErrorFallback error={null} resetErrorBoundary={() => window.location.reload()} />}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename="/">
          <ErrorProvider>
            <UserProvider>
              <DietProvider>
                <GoalsProvider>
                  <ImageProvider>
                    <ToastProvider>
                      <ConfirmationProvider>
                        <NetworkStatus />
                        <GlobalErrorBoundary>
                          <Routes>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/onboarding" element={<Onboarding />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/goals" element={<Goals />} />
                            <Route path="/diet" element={<Diet />} />
                            <Route path="/chat" element={<Chat />} />
                            <Route path="/admin" element={<Admin />} />
                            <Route path="/profile" element={<Profile onRestartTutorial={handleRestartTutorial} />} />
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                          </Routes>
                        </GlobalErrorBoundary>
                      </ConfirmationProvider>
                    </ToastProvider>
                  </ImageProvider>
                </GoalsProvider>
              </DietProvider>
            </UserProvider>
          </ErrorProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;