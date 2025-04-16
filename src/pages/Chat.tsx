import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2 } from 'lucide-react';
import { auth, db, storage } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { processChat } from '../lib/chat';
import BottomNav from '../components/BottomNav';
import { simulateTyping } from '../utils/chat';
import type { Message } from '../types/chat';
import type { UserProfile } from '../types/user';

function Chat() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 1, 
      text: 'Olá! Sou a Dra. Helena, nutricionista especializada em nutrição clínica e esportiva.\n\nComo gostaria de começar nossa consulta hoje?\n\nPosso auxiliar com:\n• Orientações nutricionais\n• Cálculo de macros (ex: "calcular macros: arroz, frango")\n• Análise de alimentos por foto\n• Dicas e receitas saudáveis', 
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const loadUserData = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserProfile);
        } else {
          setError('Perfil não encontrado. Por favor, faça login novamente.');
          navigate('/login');
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        setError('Erro ao carregar seu perfil. Por favor, tente novamente.');
      }
    };

    loadUserData();
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !userData || isLoading) return;
    setError(null);
    const messageText = message.trim();
    setMessage('');

    const userMessage: Message = {
      id: Date.now(),
      text: messageText,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await processChat([...messages, userMessage], userData);
      
      // Start typing animation
      setIsTyping(true);
      
      // Split response into fragments and simulate typing
      await simulateTyping(response, async (fragment) => {
        const fragmentMessage = {
          id: Date.now(),
          text: fragment,
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, fragmentMessage]);
      });

    } catch (error) {
      console.error('Erro ao obter resposta:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erro ao processar sua mensagem. Por favor, tente novamente.';
      
      setError(errorMessage);
      
      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          text: `❌ ${errorMessage}`,
          isBot: true,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const renderSuggestions = () => {
    const suggestions = [
      'Como está meu progresso?',
      'Calcular macros: arroz, frango, batata',
      'Sugestões de lanches saudáveis',
      'Dicas para atingir minha meta'
    ];

    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {suggestions.map(suggestion => (
          <button
            key={suggestion}
            onClick={() => setMessage(suggestion)}
            className="px-4 py-2 bg-white rounded-full text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 shadow-sm max-w-md w-full">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Erro</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-primary-500 text-white rounded-lg py-2 hover:bg-primary-600 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-safe-bottom">
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent mb-2">
          Consulta Nutricional
        </h1>
        <p className="text-gray-600 mb-4">Atendimento Especializado</p>

        {messages.length === 1 && renderSuggestions()}

        <div className="space-y-4 mb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'} animate-fade-in`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-2xl ${
                  msg.isBot
                    ? 'bg-white text-gray-800 shadow-lg'
                    : 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                {msg.timestamp && (
                  <div className={`text-xs mt-1 ${msg.isBot ? 'text-gray-500' : 'text-white/70'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white p-4 rounded-2xl shadow-lg">
                {isTyping ? (
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                    <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                  </div>
                ) : (
                  <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 p-4 shadow-lg safe-area-bottom">
        <form onSubmit={handleSend} className="max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-grow p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm bg-white"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !message.trim()}
              className={`p-3 rounded-xl ${
                isLoading || !message.trim()
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary-500 to-secondary-500 hover:shadow-lg transform hover:-translate-y-0.5'
              } text-white transition-colors`}
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>

      <BottomNav />
    </div>
  );
}

export default Chat