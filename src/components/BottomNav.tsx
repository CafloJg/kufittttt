import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Utensils, Target, MessageSquare, User, Coins } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import type { UserProfile } from '../types/user';

interface NavItem {
  path: string;
  icon: typeof Home;
  label: string;
}

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<UserProfile | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserProfile);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);
  
  const navItems: NavItem[] = [
    { path: '/dashboard', icon: Home, label: 'Inicio' },
    { path: '/diet', icon: Utensils, label: 'Dieta' },
    { path: '/goals', icon: Target, label: 'Metas' },
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
    { path: '/profile', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 shadow-sm z-50 hardware-accelerated">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              id={`nav-${path.substring(1)}`}
              key={path}
              onClick={() => navigate(path)}
              className={`
                relative flex flex-col items-center justify-center gap-1
                min-w-[64px] h-full touch-feedback hardware-accelerated
                ${isActive ? 'text-primary-500' : 'text-gray-500'}
              `}
            >
              {/* Active Indicator */}
              {isActive && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-primary-500" />
              )}

              {/* Icon */}
              <div className={`relative ${isActive ? 'scale-110 animate-bounce-subtle' : ''}`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                {/* Ripple Effect */}
                <span className={`
                  absolute inset-0 rounded-full bg-primary-100 opacity-0
                  ${isActive ? 'animate-ping' : ''}
                `} />
              </div>

              {/* Label */}
              <span className={`
                text-2xs font-medium transition-all
                ${isActive ? 'opacity-100 transform translate-y-0' : 'opacity-70 transform translate-y-0'}
              `}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Safe Area Spacer - Garante espaço adequado para iPhones com notch/Dynamic Island */}
      <div className="h-[env(safe-area-inset-bottom,0px)] bg-white/95 border-t border-gray-100/20" />
    </nav>
  );
}

export default BottomNav