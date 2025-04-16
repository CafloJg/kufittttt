import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Upload, X, Info } from 'lucide-react';
import { auth, db, storage } from '../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { UserProfile, OnboardingData, DietType, Gender, BudgetPreference, LifeContext } from '../types/user';
import Slider from '../components/Slider';
import { motion } from 'framer-motion';
import Radio from '../components/Radio';

const COMMON_ALLERGIES = [
  'Leite',
  'Ovo',
  'Amendoim',
  'Soja',
  'Trigo',
  'Peixe',
  'Frutos do Mar',
  'Nozes'
];

const DIET_OPTIONS = [
  { 
    value: 'omnivoro', 
    label: 'Onívoro',
    description: 'Dieta tradicional que inclui todos os grupos alimentares: carnes, peixes, ovos, laticínios, vegetais, frutas e grãos.'
  },
  { 
    value: 'vegetariano', 
    label: 'Vegetariano',
    description: 'Exclui carnes e peixes, mas inclui ovos e laticínios. Rica em vegetais, legumes, grãos e proteínas vegetais.'
  },
  { 
    value: 'vegano', 
    label: 'Vegano',
    description: 'Exclui todos os produtos de origem animal. Baseada em vegetais, legumes, grãos, frutas e proteínas vegetais.'
  },
  { 
    value: 'low-carb', 
    label: 'Low Carb',
    description: 'Redução de carboidratos, com foco em proteínas e gorduras boas. Ideal para controle de peso e energia estável.'
  },
  { 
    value: 'cetogenica', 
    label: 'Cetogênica',
    description: 'Muito baixa em carboidratos e alta em gorduras boas. Induz o corpo a usar gordura como fonte principal de energia.'
  },
  { 
    value: 'mediterranea', 
    label: 'Mediterrânea',
    description: 'Inspirada na culinária mediterrânea, rica em azeite, peixes, vegetais, grãos integrais e gorduras saudáveis.'
  }
];

const DEFAULT_FORM_DATA = {
  name: '',
  age: undefined as number | undefined,
  gender: '' as Gender,
  height: undefined as number | undefined,
  weight: undefined as number | undefined,
  dietType: '' as DietType,
  allergies: [] as string[],
  budgetPreference: '' as BudgetPreference,
  lifeContext: '' as LifeContext,
  photoURL: undefined as string | undefined
};

function Onboarding() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<OnboardingData>({
    step: 1,
    totalSteps: 5,
    formData: DEFAULT_FORM_DATA
  });
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newIngredient, setNewIngredient] = useState('');
  const [error, setError] = useState('');
  const [showDietInfo, setShowDietInfo] = useState(false);
  const [selectedDietInfo, setSelectedDietInfo] = useState<DietType | null>(null);
  
  useEffect(() => {
    const checkAuth = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }
      setIsLoading(false);
    };
    
    checkAuth();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setData(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [name]: type === 'number' ? (value ? Number(value) : undefined) : value
      }
    }));
  };

  const handleGenderSelect = (gender: Gender) => {
    setData(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        gender
      }
    }));
  };

  const handleDietSelect = (dietType: DietType) => {
    setData(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        dietType
      }
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploading(true);
    setUploadError('');

    try {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('A foto deve ter no máximo 5MB');
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('O arquivo deve ser uma imagem');
      }

      const storageRef = ref(storage, `profile-photos/${auth.currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);

      setData(prev => ({
        ...prev,
        formData: {
          ...prev.formData,
          photoURL
        }
      }));
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      setUploadError(
        error instanceof Error 
          ? error.message 
          : 'Erro ao fazer upload da foto. Tente novamente.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const sanitizeDataForFirestore = (data: typeof DEFAULT_FORM_DATA) => {
    return {
      ...data,
      age: data.age || null,
      height: data.height || null,
      weight: data.weight || null,
      updatedAt: new Date().toISOString()
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="relative z-10 mb-12">
          {data.step > 1 && (
            <button
              onClick={() => setData(prev => ({ ...prev, step: prev.step - 1 }))}
              className="absolute -left-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/80 rounded-xl transition-colors"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
          )}
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
              Configuração Inicial
            </h1>
            <p className="text-gray-600 mt-2">Passo {data.step} de {data.totalSteps}</p>
            <div className="flex gap-2 mt-4 max-w-xs mx-auto">
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full flex-1 transition-all ${
                    step === data.step
                      ? 'bg-gradient-to-r from-primary-500 to-secondary-500'
                      : step < data.step
                      ? 'bg-primary-200'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Background Decorations */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary-500/5 blur-3xl" />
          <div className="absolute top-60 -left-40 w-[32rem] h-[32rem] rounded-full bg-secondary-500/5 blur-3xl" />
        </div>

        {/* Step Content */}
        <div className="relative">
          {/* Step 1: Basic Info */}
          {data.step === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold mb-2">Informações Básicas</h2>
                <p className="text-gray-600">Vamos começar com algumas informações sobre você</p>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={data.formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white/50 backdrop-blur-sm transition-all hover:bg-white"
                  required
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
                  value={data.formData.age || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white/50 backdrop-blur-sm transition-all hover:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gênero
                </label>
                <Radio value={data.formData.gender} onChange={handleGenderSelect} />
              </div>

              <button
                onClick={() => setData(prev => ({ ...prev, step: prev.step + 1 }))}
                className="w-full py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-medium shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/30 transform hover:-translate-y-0.5 transition-all"
              >
                Continuar
              </button>
            </motion.div>
          )}

          {/* Step 2: Physical Info */}
          {data.step === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold mb-2">Medidas Corporais</h2>
                <p className="text-gray-600">Estas informações nos ajudam a personalizar seu plano</p>
              </div>

              <div>
                <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                  Altura (cm)
                </label>
                <input
                  type="number"
                  id="height"
                  name="height"
                  value={data.formData.height || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white/50 backdrop-blur-sm transition-all hover:bg-white"
                  required
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
                  value={data.formData.weight || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white/50 backdrop-blur-sm transition-all hover:bg-white"
                  required
                />
              </div>

              <button
                onClick={() => setData(prev => ({ ...prev, step: prev.step + 1 }))}
                className="w-full py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-medium shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/30 transform hover:-translate-y-0.5 transition-all"
              >
                Continuar
              </button>
            </motion.div>
          )}

          {/* Step 3: Diet Preferences */}
          {data.step === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold mb-2">Preferências Alimentares</h2>
                <p className="text-gray-600">Escolha o tipo de dieta e alergias</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Dieta
                  <button
                    onClick={() => setShowDietInfo(true)}
                    className="ml-2 inline-flex items-center text-primary-500 hover:text-primary-600"
                  >
                    <Info size={16} />
                  </button>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {DIET_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => {
                        handleDietSelect(value);
                        setSelectedDietInfo(value);
                        setShowDietInfo(true);
                      }}
                      className={`relative py-4 px-4 rounded-xl border backdrop-blur-sm transition-all ${
                        data.formData.dietType === value
                          ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white border-transparent shadow-lg'
                          : 'border-gray-200 text-gray-700 hover:border-primary-500 bg-white/50 hover:bg-white'
                      }`}
                    >
                      <span>{label}</span>
                      <Info 
                        size={16} 
                        className={`absolute top-2 right-2 ${
                          data.formData.dietType === value ? 'text-white' : 'text-primary-500'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Diet Info Modal */}
              {showDietInfo && selectedDietInfo && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
                    <button
                      onClick={() => setShowDietInfo(false)}
                      className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X size={20} />
                    </button>
                    
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold mb-2">
                        {DIET_OPTIONS.find(opt => opt.value === selectedDietInfo)?.label}
                      </h3>
                      <p className="text-gray-600">
                        {DIET_OPTIONS.find(opt => opt.value === selectedDietInfo)?.description}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => setShowDietInfo(false)}
                      className="w-full py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
                    >
                      Entendi
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alergias
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COMMON_ALLERGIES.map(allergy => (
                    <button
                      key={allergy}
                      onClick={() => {
                        setData(prev => ({
                          ...prev,
                          formData: {
                            ...prev.formData,
                            allergies: prev.formData.allergies.includes(allergy)
                              ? prev.formData.allergies.filter(a => a !== allergy)
                              : [...prev.formData.allergies, allergy]
                          }
                        }));
                      }}
                      className={`py-3 px-4 rounded-xl border backdrop-blur-sm transition-all ${
                        data.formData.allergies.includes(allergy)
                          ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white border-transparent shadow-md'
                          : 'border-gray-200 text-gray-700 hover:border-primary-500 bg-white/50 hover:bg-white'
                      }`}
                    >
                      {allergy}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setData(prev => ({ ...prev, step: prev.step + 1 }))}
                className="w-full py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-medium shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/30 transform hover:-translate-y-0.5 transition-all"
              >
                Continuar
              </button>
            </motion.div>
          )}

          {/* Step 4: Budget and Life Context */}
          {data.step === 4 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold mb-2">Preferências de Orçamento</h2>
                <p className="text-gray-600">Escolha opções que se encaixam no seu perfil</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferência de Orçamento
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setData(prev => ({
                      ...prev,
                      formData: { ...prev.formData, budgetPreference: 'low' }
                    }))}
                    className={`p-4 rounded-xl border backdrop-blur-sm transition-all ${
                      data.formData.budgetPreference === 'low'
                        ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white border-transparent'
                        : 'border-gray-200 text-gray-700 hover:border-primary-500 bg-white/50'
                    }`}
                  >
                    <div className="font-semibold mb-1">Econômico</div>
                    <div className="text-sm opacity-80">Foco em opções acessíveis e econômicas</div>
                  </button>

                  <button
                    onClick={() => setData(prev => ({
                      ...prev,
                      formData: { ...prev.formData, budgetPreference: 'medium' }
                    }))}
                    className={`p-4 rounded-xl border backdrop-blur-sm transition-all ${
                      data.formData.budgetPreference === 'medium'
                        ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white border-transparent'
                        : 'border-gray-200 text-gray-700 hover:border-primary-500 bg-white/50'
                    }`}
                  >
                    <div className="font-semibold mb-1">Moderado</div>
                    <div className="text-sm opacity-80">Equilíbrio entre custo e qualidade</div>
                  </button>

                  <button
                    onClick={() => setData(prev => ({
                      ...prev,
                      formData: { ...prev.formData, budgetPreference: 'high' }
                    }))}
                    className={`p-4 rounded-xl border backdrop-blur-sm transition-all ${
                      data.formData.budgetPreference === 'high'
                        ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white border-transparent'
                        : 'border-gray-200 text-gray-700 hover:border-primary-500 bg-white/50'
                    }`}
                  >
                    <div className="font-semibold mb-1">Premium</div>
                    <div className="text-sm opacity-80">Prioridade em produtos de alta qualidade</div>
                  </button>
                </div>
              </div>

              {data.formData.gender === 'feminino' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contexto de Vida
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => setData(prev => ({
                        ...prev,
                        formData: { ...prev.formData, lifeContext: 'maternity' }
                      }))}
                      className={`p-4 rounded-xl border backdrop-blur-sm transition-all ${
                        data.formData.lifeContext === 'maternity'
                          ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white border-transparent'
                          : 'border-gray-200 text-gray-700 hover:border-primary-500 bg-white/50'
                      }`}
                    >
                      <div className="font-semibold mb-1">Maternidade</div>
                      <div className="text-sm opacity-80">Gestante ou amamentando</div>
                    </button>

                    <button
                      onClick={() => setData(prev => ({
                        ...prev,
                        formData: { ...prev.formData, lifeContext: 'home' }
                      }))}
                      className={`p-4 rounded-xl border backdrop-blur-sm transition-all ${
                        data.formData.lifeContext === 'home'
                          ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white border-transparent'
                          : 'border-gray-200 text-gray-700 hover:border-primary-500 bg-white/50'
                      }`}
                    >
                      <div className="font-semibold mb-1">Dona de Casa</div>
                      <div className="text-sm opacity-80">Foco em praticidade e organização</div>
                    </button>

                    <button
                      onClick={() => setData(prev => ({
                        ...prev,
                        formData: { ...prev.formData, lifeContext: 'none' }
                      }))}
                      className={`p-4 rounded-xl border backdrop-blur-sm transition-all ${
                        data.formData.lifeContext === 'none'
                          ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white border-transparent'
                          : 'border-gray-200 text-gray-700 hover:border-primary-500 bg-white/50'
                      }`}
                    >
                      <div className="font-semibold mb-1">Nenhum dos Anteriores</div>
                      <div className="text-sm opacity-80">Plano padrão personalizado</div>
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setData(prev => ({ ...prev, step: prev.step + 1 }))}
                className="w-full py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-medium shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/30 transform hover:-translate-y-0.5 transition-all"
              >
                Continuar
              </button>
            </motion.div>
          )}

          {/* Step 5: Profile Photo */}
          {data.step === 5 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-semibold mb-2">Foto de Perfil</h2>
                <p className="text-gray-600">Personalize seu perfil com uma foto</p>
                
                <div className="w-48 h-48 bg-gradient-to-br from-primary-50 to-primary-100 rounded-full mx-auto relative overflow-hidden shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 cursor-pointer">
                  {data.formData.photoURL ? (
                    <img
                      src={data.formData.photoURL}
                      alt="Profile"
                      className="w-full h-full object-cover rounded-full transition-transform hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary-50/50 to-primary-100/50 backdrop-blur-sm">
                      <Camera className="w-16 h-16 text-primary-400 mb-2 animate-bounce-subtle" />
                      <span className="text-sm text-primary-600 font-medium">Clique para adicionar</span>
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
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
                  className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all ${
                    isUploading 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-primary-500 cursor-pointer hover:text-primary-600 hover:-translate-y-0.5'
                  }`}
                >
                  <Upload size={20} />
                  <span>{isUploading ? 'Enviando...' : 'Alterar foto'}</span>
                </label>
                
                {/* Make the profile image clickable to trigger file upload */}
                <div 
                  onClick={() => document.getElementById('photo-upload')?.click()}
                  className="absolute inset-0 top-[120px] w-48 h-48 mx-auto cursor-pointer"
                  aria-label="Clique para adicionar foto"
                />
                
                {uploadError && (
                  <div className="bg-red-50 text-red-500 p-4 rounded-xl mt-4 animate-shake">
                    {uploadError}
                  </div>
                )}
              </div>

              <button
                onClick={async () => {
                  if (!auth.currentUser) return;
                  setIsSubmitting(true);
                  try {
                    const userRef = doc(db, 'users', auth.currentUser.uid);
                    await updateDoc(userRef, {
                      ...sanitizeDataForFirestore(data.formData),
                      completedOnboarding: true,
                      showTutorial: true, // Only set to true after onboarding is completed
                      updatedAt: new Date().toISOString()
                    });
                    navigate('/dashboard');
                  } catch (error) {
                    console.error('Error saving profile:', error);
                    setError('Erro ao salvar perfil. Por favor, tente novamente.');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-medium shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/30 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:transform-none disabled:hover:shadow-none"
              >
                {isSubmitting ? 'Salvando...' : 'Concluir Cadastro'}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Onboarding;