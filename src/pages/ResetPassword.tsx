import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { FirebaseError } from 'firebase/app';
import { sendPasswordResetEmail } from 'firebase/auth';

function ResetPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err) {
      console.error('Erro ao enviar email de redefinição:', err);
      if (err instanceof FirebaseError) {
        if (err.code === 'auth/user-not-found') {
          setError('Email não encontrado. Verifique o endereço e tente novamente.');
        } else if (err.code === 'auth/network-request-failed') {
          setError('Erro de conexão. Verifique sua internet e tente novamente.');
        } else {
          setError('Erro ao enviar email de redefinição. Tente novamente.');
        }
      } else {
        setError('Erro ao enviar email de redefinição. Tente novamente.');
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
          <h2 className="text-2xl font-semibold text-gray-800 mb-2 font-display">
            Redefinir Senha
          </h2>
          <p className="text-gray-600 mb-6">
            Digite seu email para receber as instruções de redefinição de senha.
          </p>
          
          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center">
              <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6">
                Email enviado! Verifique sua caixa de entrada para redefinir sua senha.
              </div>
              <button
                onClick={() => navigate('/login')}
                className="text-primary-500 hover:text-primary-600 font-medium"
              >
                Voltar para o login
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword}>
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
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-500 text-white rounded-lg py-3 mt-6 hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Enviando...' : 'Enviar Email'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full text-gray-600 mt-4 hover:text-gray-800"
              >
                Voltar para o login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;