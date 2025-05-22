import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { setPersistence, browserLocalPersistence, browserSessionPersistence, signInWithCredential, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '../types/user';
import { useAuth } from '../hooks/useAuth';
import { signInWithEmailAndPassword } from 'firebase/auth';

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { signIn, isLoading, error, setError } = useAuth();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setError) setError('');

    try {
      // Check if online
      if (!navigator.onLine) {
        if (setError) setError('Você está offline. Verifique sua conexão com a internet e tente novamente.');
        return;
      }

      await signIn(email.toLowerCase(), password);
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      if (setError) setError('Ocorreu um erro ao fazer login. Por favor, tente novamente.');
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data() as UserProfile;
        
        if (userData && !userData.completedOnboarding) {
          navigate('/onboarding');
        } else if (userData) {
          navigate('/dashboard');
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-500 to-secondary-500 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/kiifit-4234c.firebasestorage.app/o/logo.png?alt=media&token=191afae3-77cd-4f5b-a4cb-ce6779c56dfe"
            alt="KiiFit Logo"
            className="w-24 h-24 mx-auto mb-4 object-contain"
          />
          <h1 className="text-3xl font-bold text-gray-800">Bem-vindo de volta!</h1>
          <p className="text-gray-600">Faça login para continuar no KiiFit.</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input 
              type="email" 
              id="email" 
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition duration-150 ease-in-out"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Senha
            </label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                id="password" 
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition duration-150 ease-in-out"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                placeholder="Sua senha"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700 transition-colors duration-150"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input 
                id="remember-me" 
                name="remember-me" 
                type="checkbox" 
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 cursor-pointer">
                Lembrar de mim
              </label>
            </div>
            <div className="text-sm">
              <a href="/reset-password" className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-150">
                Esqueceu a senha?
              </a>
            </div>
          </div>

          <div>
            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition duration-150 ease-in-out"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Não tem uma conta? 
          <a href="/register" className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-150">
            Crie uma agora
          </a>
        </p>
      </div>
    </div>
  );
}

export default Login;