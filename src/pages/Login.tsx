import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import type { UserProfile } from '../types/user';

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);

    try {
      // Check if online
      if (!navigator.onLine) {
        setError('Você está offline. Verifique sua conexão com a internet e tente novamente.');
        setIsLoading(false);
        return;
      }

      // Set persistence based on rememberMe
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      const userCredential = await signInWithEmailAndPassword(auth, email.toLowerCase(), password);
      
      // Check subscription status and onboarding
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const userData = userDoc.data() as UserProfile;

      if (!userData) {
        setError('Usuário não encontrado. Por favor, verifique suas credenciais.');
        await auth.signOut();
        return;
      }

      // Redirecionar baseado no status do onboarding
      const redirectPath = !userData.completedOnboarding 
        ? '/onboarding'
        : '/dashboard';

      setIsLoading(false);
      navigate(redirectPath);
    } catch (err) {
      console.error('Login error:', err);
      setIsLoading(false);

      if (err instanceof FirebaseError) {
        if (err.code === 'auth/invalid-credential') {
          setError('Email ou senha incorretos');
        } else if (err.code === 'auth/too-many-requests') {
          setError('Muitas tentativas. Tente novamente mais tarde.');
        } else if (err.code === 'auth/network-request-failed') {
          setError('Erro de conexão. Verifique sua internet e tente novamente.');
        } else {
          setError('Erro ao fazer login. Por favor, tente novamente.');
        }
      } else if (err instanceof Error) {
        if (err.message.includes('offline') || err.message.includes('client is offline')) {
          setError('Você está offline. Verifique sua conexão com a internet e tente novamente.');
        } else {
          setError('Erro ao fazer login. Por favor, tente novamente.');
        }
      } else {
        setError('Erro ao fazer login. Por favor, tente novamente.');
      }
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data() as UserProfile;
        
        if (!userData?.completedOnboarding) {
          navigate('/onboarding');
        } else {
          navigate('/dashboard');
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-500 to-secondary-500 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/kiifit-4234c.firebasestorage.app/o/logo.png?alt=media&token=191afae3-77cd-4f5b-a4cb-ce6779c56dfe"
            alt="KiiFit Logo"
            className="w-32 h-32 mx-auto mb-4 object-contain"
          />
        </div>
        
        <div className="bg-white rounded-3xl p-8 shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2 font-display">Bem Vindo</h2>
          <p className="text-gray-600 mb-6">Entre na sua conta para continuar</p>
          
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  disabled={isLoading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-600">
                  Lembrar acesso
                </label>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-500 text-white rounded-lg py-3 mt-6 hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="w-full bg-secondary-500 text-white rounded-lg py-3 mt-3 hover:bg-secondary-600 transition-colors"
            >
              Primeiro Acesso
            </button>
          </form>
          
          <p className="text-center text-sm text-gray-600 mt-4">
            Esqueceu sua senha?{' '}
            <button
              onClick={() => navigate('/reset-password')}
              className="text-primary-500 hover:underline"
            >
              Resetar senha aqui
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;