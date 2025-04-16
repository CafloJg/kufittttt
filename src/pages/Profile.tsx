import React, { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import { Settings, Bell, Shield, HelpCircle, LogOut, Camera, Upload, X, ChevronRight, Coins, Calendar, Crown, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext'; 
import LoadingIndicator from '../components/ui/LoadingIndicator';
import { useErrorHandling } from '../hooks/useErrorHandling'; 
import { useProfile } from '../hooks/useProfile';
import { auth } from '../lib/firebase';
import type { Gender, DietType } from '../types/user';

interface ProfileProps {
  onRestartTutorial: () => void;
}

const DIET_OPTIONS: { value: DietType; label: string }[] = [
  { value: 'omnivoro', label: 'Onívoro' },
  { value: 'vegetariano', label: 'Vegetariano' },
  { value: 'vegano', label: 'Vegano' },
  { value: 'low-carb', label: 'Low Carb' },
  { value: 'cetogenica', label: 'Cetogênica' },
  { value: 'mediterranea', label: 'Mediterrânea' }
];

function Profile({ onRestartTutorial }: ProfileProps) {
  const navigate = useNavigate();
  const { user, isLoading: userLoading, refreshUserData } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [editData, setEditData] = useState<Partial<typeof user>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [showFavorites, setShowFavorites] = useState(false);
  const { uploadProfilePhoto, updateProfile } = useProfile();
  const { error: handlingError, setError, withErrorHandling } = useErrorHandling();

  // Render favorites modal
  const renderFavorites = () => {
    if (!showFavorites) return null;

    const favorites = user?.favoriteMeals || {};
    const sortedFavorites = Object.entries(favorites)
      .sort(([, a], [, b]) => 
        new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      );

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50">
        <div className="bg-white min-h-screen max-w-lg mx-auto flex flex-col max-h-screen">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold">Refeições Favoritas</h2>
            <button
              onClick={() => setShowFavorites(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-4 overflow-y-auto mobile-scroll">
            {sortedFavorites.length > 0 ? (
              <div className="space-y-4">
                {sortedFavorites.map(([id, meal]) => (
                  <div key={id} className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{meal.name}</h3>
                      <span className="text-sm text-gray-500">
                        {new Date(meal.savedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>{meal.calories} kcal</p>
                      <p>
                        P: {meal.protein}g • C: {meal.carbs}g • G: {meal.fat}g
                      </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Alimentos:
                      </p>
                      <div className="space-y-1">
                        {meal.foods.map((food, index) => (
                          <p key={index} className="text-sm text-gray-600">
                            • {food.name} ({food.portion})
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-600">
                  Você ainda não tem refeições favoritas
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    setEditData(user);
    
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [navigate]);

  // Função para verificar se o perfil está completo para gerar um plano de dieta
  const getProfileCompleteness = () => {
    if (!user) return { isComplete: false, missingData: [] };
    
    const missingData = [];
    if (!user.weight) missingData.push('peso');
    if (!user.height) missingData.push('altura');
    if (!user.age) missingData.push('idade');
    if (!user.gender) missingData.push('gênero');
    if (!user.dietType) missingData.push('tipo de dieta');
    if (!user.goals?.type) missingData.push('objetivos');
    
    return {
      isComplete: missingData.length === 0,
      missingData
    };
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    setUploadError('');

    uploadProfilePhoto(file)
      .then(() => {
        refreshUserData();
      })
      .catch(err => {
        console.error('Error uploading photo:', err);
        setUploadError(err instanceof Error ? err.message : 'Erro ao fazer upload da foto');
      })
      .finally(() => {
        setIsUploading(false);
      });
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? Number(value) : undefined) : value
    }));
  };

  const handleGenderSelect = (gender: Gender) => {
    setEditData(prev => ({ ...prev, gender }));
  };

  const handleDietSelect = (dietType: DietType) => {
    setEditData(prev => ({ ...prev, dietType }));
  };

  const handleSave = () => {
    if (!user) return;

    setIsSaving(true);
    setError(null);

    updateProfile(editData)
      .then(() => {
        setIsEditing(false);
        refreshUserData();
      })
      .catch(err => {
        console.error('Error saving profile:', err);
        setError('Erro ao salvar perfil. Por favor, tente novamente.');
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleLogout = async () => {
    try {
      // Sign out from Firebase Auth
      await auth.signOut();
      
      // Clear any stored user data from localStorage
      localStorage.removeItem('kiifit-store');
      
      // Navigate to login page after successful logout
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setError(error);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Este navegador não suporta notificações.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        new Notification('Notificações Ativadas!', {
          body: 'Você receberá lembretes diários do check-in às 10h.',
          icon: '/vite.svg'
        });
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
    }
  };

  const calculateDaysActive = () => {
    if (!user?.createdAt) return 0;
    
    try {
      const createdDate = user.createdAt instanceof Date 
        ? user.createdAt 
        : new Date(user.createdAt);
        
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 0;
    } catch (error) {
      console.error('Error calculating days active:', error);
      return 0;
    }
  };

  const getPlanLabel = (tier?: string) => {
    switch (tier) {
      case 'basic':
        return 'Plano Basic';
      case 'premium':
        return 'Plano Premium';
      case 'premium-plus':
        return 'Plano Premium Plus';
      default:
        return 'Plano não definido';
    }
  };

  const renderSettings = () => {
    if (!showSettings) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex">
        <div className="bg-white w-full max-w-lg mx-auto flex flex-col max-h-screen">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold">Configurações</h2>
            <button
              onClick={() => setShowSettings(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 mobile-scroll">
            {/* Informações Pessoais */}
            <div>
              <h3 className="text-lg font-medium mb-4">Informações Pessoais</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Altura</p>
                    <p className="font-medium">{editData.height || '-'}cm</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </div>

                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Peso</p>
                    <p className="font-medium">{editData.weight || '-'}kg</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </div>

                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Dieta</p>
                    <p className="font-medium">
                      {DIET_OPTIONS.find(opt => opt.value === editData.dietType)?.label || '-'}
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </div>

                {editData.allergies && editData.allergies.length > 0 && (
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Alergias</p>
                      <p className="font-medium">{editData.allergies.join(', ')}</p>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Notificações */}
            <div>
              <h3 className="text-lg font-medium mb-4">Notificações</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Lembrete de Check-in</p>
                    <p className="text-sm text-gray-600">Receba lembretes diários às 10h</p>
                  </div>
                  <button
                    onClick={requestNotificationPermission}
                    className={`px-4 py-2 rounded-lg ${
                      notificationPermission === 'granted' 
                        ? 'bg-green-500 text-white'
                        : 'bg-primary-500 text-white'
                    }`}
                  >
                    {notificationPermission === 'granted' ? 'Ativado' : 'Ativar'}
                  </button>
                </div>
              </div>
            </div>

            {/* Estatísticas */}
            <div>
              <h3 className="text-lg font-medium mb-4">Estatísticas</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={20} className="text-primary-500" />
                    <p className="font-medium">Dias Ativos</p>
                  </div>
                  <p className="text-2xl font-semibold">{calculateDaysActive()}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins size={20} className="text-primary-500" />
                    <p className="font-medium">Moedas</p>
                  </div>
                  <p className="text-2xl font-semibold">{user?.kiiCoins?.balance || 0}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown size={20} className="text-primary-500" />
                    <p className="font-medium">Plano Atual</p>
                  </div>
                  <p className="text-lg font-semibold">{getPlanLabel(user?.subscriptionTier)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add this to the render part of the component
  const renderProfileAlert = () => {
    const { isComplete, missingData } = getProfileCompleteness();
    
    if (isComplete) return null; // Se o perfil estiver completo, não mostra nada
    
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <div className="flex items-start">
          <div className="bg-amber-100 rounded-full p-2 mr-3">
            <Bell size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-medium text-amber-800">Perfil incompleto</h3>
            <p className="text-sm text-amber-700 mt-1">
              Complete seu perfil para poder gerar um plano alimentar personalizado. 
              Está faltando: <span className="font-medium">{missingData.join(', ')}</span>
            </p>
            <button 
              onClick={() => setIsEditing(true)}
              className="mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              Completar perfil
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingIndicator size="lg" centered text="Carregando perfil" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto overscroll-contain pb-safe-bottom">
      <div className="max-w-lg mx-auto px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] relative overflow-y-auto mobile-scroll-optimized">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Perfil</h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-primary-500 hover:text-primary-600"
            >
              Editar
            </button>
          )}
        </div>

        {/* Rendered Profile Alert */}
        {renderProfileAlert()}

        {/* Profile Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-primary-100 rounded-full mx-auto mb-4 flex items-center justify-center relative">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Foto de perfil"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <Camera size={32} className="text-primary-500" />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              id="photo-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="photo-upload"
              className={`inline-flex items-center gap-2 ${
                isUploading 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-primary-500 cursor-pointer hover:text-primary-600'
              }`}
            >
              <Upload size={20} />
              <span>{isUploading ? 'Enviando...' : 'Alterar foto'}</span>
            </label>
            {uploadError && (
              <p className="text-red-500 text-sm mt-2">{uploadError}</p>
            )}
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-center mb-1">
                <Coins className="text-primary-500" size={20} />
              </div>
              <p className="text-sm text-gray-600">KiiCoins</p>
              <p className="font-semibold">{user?.kiiCoins?.balance || 0}</p>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-center mb-1">
                <Crown className="text-primary-500" size={20} />
              </div>
              <p className="text-sm text-gray-600">Plano</p>
              <p className="font-semibold capitalize">{user?.subscriptionTier || 'Basic'}</p>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-center mb-1">
                <Calendar className="text-primary-500" size={20} />
              </div>
              <p className="text-sm text-gray-600">Dias Ativos</p>
              <p className="font-semibold">{calculateDaysActive()}</p>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={editData.name || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                  Idade
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={editData.age || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gênero
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleGenderSelect('feminino')}
                    className={`flex-1 py-3 px-4 rounded-lg border ${
                      editData.gender === 'feminino'
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'border-gray-300 text-gray-700 hover:border-primary-500'
                    }`}
                  >
                    Feminino
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenderSelect('masculino')}
                    className={`flex-1 py-3 px-4 rounded-lg border ${
                      editData.gender === 'masculino'
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'border-gray-300 text-gray-700 hover:border-primary-500'
                    }`}
                  >
                    Masculino
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenderSelect('nao-binario')}
                    className={`flex-1 py-3 px-4 rounded-lg border ${
                      editData.gender === 'nao-binario'
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'border-gray-300 text-gray-700 hover:border-primary-500'
                    }`}
                  >
                    Não Binário
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                  Altura (cm)
                </label>
                <input
                  type="number"
                  id="height"
                  name="height"
                  value={editData.height || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  id="weight"
                  name="weight"
                  value={editData.weight || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Dieta
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {DIET_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleDietSelect(value)}
                      className={`py-3 px-4 rounded-lg border ${
                        editData.dietType === value
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'border-gray-300 text-gray-700 hover:border-primary-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setEditData(user || {});
                    setIsEditing(false);
                  }}
                  className="flex-1 py-3 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Nome</p>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-medium">{user?.name || '-'}</p>
                  <div className="flex items-center gap-2 bg-primary-50 px-3 py-1.5 rounded-xl">
                    <Coins className="text-primary-500" size={16} />
                    <span className="font-medium">{user?.kiiCoins?.balance || 0}</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-lg font-medium">{user?.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Idade</p>
                  <p className="text-lg font-medium">{user?.age || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gênero</p>
                  <p className="text-lg font-medium capitalize">{user?.gender || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Altura</p>
                  <p className="text-lg font-medium">{user?.height ? `${user.height}cm` : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Peso</p>
                  <p className="text-lg font-medium">{user?.weight ? `${user.weight}kg` : '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tipo de Dieta</p>
                <p className="text-lg font-medium">
                  {DIET_OPTIONS.find(opt => opt.value === user?.dietType)?.label || '-'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Settings Menu */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            <button 
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center p-4 hover:bg-gray-50 transition-colors"
            >
              <Settings size={20} className="text-primary-500 mr-3" />
              <span className="text-gray-700">Configurações</span>
            </button>
            
            <button 
              onClick={requestNotificationPermission}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Bell size={20} className="text-primary-500 mr-3" />
                <span className="text-gray-700">Notificações</span>
              </div>
              <span className={`text-sm ${
                notificationPermission === 'granted' 
                  ? 'text-green-500' 
                  : 'text-gray-500'
              }`}>
                {notificationPermission === 'granted' ? 'Ativadas' : 'Desativadas'}
              </span>
            </button>
            
            <a 
              href="https://kiifit.app/politica-de-privacidade"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center p-4 hover:bg-gray-50 transition-colors"
            >
              <Shield size={20} className="text-primary-500 mr-3" />
              <span className="text-gray-700">Privacidade</span>
            </a>
            
            <button
              onClick={onRestartTutorial}
              className="w-full flex items-center p-4 hover:bg-gray-50 transition-colors"
            >
              <HelpCircle size={20} className="text-primary-500 mr-3" />
              <span className="text-gray-700">Ver Tutorial</span>
            </button>
            
            <button 
              onClick={() => setShowFavorites(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Heart size={20} className="text-primary-500 mr-3" />
                <span className="text-gray-700">Refeições Favoritas</span>
              </div>
              <span className="text-sm text-gray-500">
                {Object.keys(user?.favoriteMeals || {}).length}
              </span>
            </button>
            
            <a 
              href="https://kiifit.app/suporte"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center p-4 hover:bg-gray-50 transition-colors"
            >
              <HelpCircle size={20} className="text-primary-500 mr-3" />
              <span className="text-gray-700">Ajuda</span>
            </a>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center p-4 hover:bg-gray-50 transition-colors text-red-600"
            >
              <LogOut size={20} className="mr-3" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>

      {showSettings && renderSettings()}
      {showFavorites && renderFavorites()}
      <BottomNav />
    </div>
  );
}

export default Profile;