import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '../types/user';

function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const validatePasswords = () => {
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return false;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePasswords()) {
      return;
    }

    setIsLoading(true);

    try {
      // Check if we're online before attempting to register
      if (!navigator.onLine) {
        setError('Você está offline. Verifique sua conexão com a internet e tente novamente.');
        setIsLoading(false);
        return;
      }
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile
      const userProfile: UserProfile = {
        uid: userCredential.user.uid,
        email: email.toLowerCase(),
        name: '',
        subscriptionTier: 'basic',
        subscriptionStatus: 'active',
        createdAt: new Date(),
        completedOnboarding: false,
        showTutorial: null,
        dailyStats: {
          caloriesConsumed: 0,
          proteinConsumed: 0,
          carbsConsumed: 0,
          fatConsumed: 0,
          waterIntake: 0,
          stepsCount: 0,
          workoutMinutes: 0,
          completedMeals: { [new Date().toISOString().split('T')[0]]: [] },
          lastUpdated: new Date()
        }
      };

      // Create user document
      await setDoc(doc(db, 'users', userCredential.user.uid), userProfile);
      
      try {
        // Navigate to onboarding on success
        navigate('/onboarding');
      } catch (navError) {
        console.error('Navigation error:', navError);
        // If navigation fails, try to reload the page
        window.location.href = '/onboarding';
      }
    } catch (err) {
      console.error('Erro ao criar conta:', err);
      
      // Handle Firebase auth errors
      if (err instanceof FirebaseError && err.code === 'auth/email-already-in-use') {
        setError('Este email já está cadastrado. Por favor, faça login ou use outro email.');
      } else if (err instanceof FirebaseError && err.code === 'auth/network-request-failed') {
        setError('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        setError('Erro ao criar conta. Verifique seus dados e tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          <h2 className="text-2xl font-semibold text-gray-800 mb-2 font-display">Novo Cadastro</h2>
          <p className="text-gray-600 mb-6">Crie sua conta para começar</p>
          
          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          <form onSubmit={handleRegister}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Crie sua senha"
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
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirme sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-500 text-white rounded-lg py-3 mt-6 hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Criando conta...' : 'Criar Conta'}
            </button>
          </form>
          
          <p className="text-center text-sm text-gray-600 mt-4">
            Já tem uma conta?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-primary-500 hover:underline"
            >
              Faça login aqui
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;