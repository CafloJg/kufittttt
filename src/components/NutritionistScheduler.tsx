import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User } from 'lucide-react';
import { getAvailableNutritionistSlots, scheduleNutritionistSession } from '../utils/subscription';
import type { NutritionistSession } from '../types/user';

interface NutritionistSchedulerProps {
  userId: string;
  onSchedule: (session: NutritionistSession) => void;
}

function NutritionistScheduler({ userId, onSchedule }: NutritionistSchedulerProps) {
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const slots = getAvailableNutritionistSlots();
    setAvailableSlots(slots);
  }, []);

  const handleSchedule = async () => {
    if (!selectedSlot) return;
    setIsLoading(true);
    setError(null);

    try {
      const session = await scheduleNutritionistSession(
        { uid: userId } as any,
        selectedSlot
      );
      onSchedule(session);
    } catch (error) {
      setError(
        error instanceof Error 
          ? error.message 
          : 'Erro ao agendar consulta'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-medium mb-4">Agendar Consulta</h3>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione um horário
          </label>
          <div className="grid grid-cols-3 gap-3">
            {availableSlots.map((slot) => (
              <button
                key={slot.toISOString()}
                onClick={() => setSelectedSlot(slot)}
                className={`p-3 rounded-lg border text-sm ${
                  selectedSlot?.toISOString() === slot.toISOString()
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'border-gray-300 text-gray-700 hover:border-primary-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={16} />
                  <span>{slot.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>{slot.toLocaleTimeString().slice(0, 5)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-xl">
          <User className="text-primary-500" size={24} />
          <div>
            <p className="font-medium">Dra. Ana Silva</p>
            <p className="text-sm text-gray-600">Nutricionista Esportiva</p>
          </div>
        </div>

        <button
          onClick={handleSchedule}
          disabled={!selectedSlot || isLoading}
          className="w-full bg-primary-500 text-white rounded-lg py-3 hover:bg-primary-600 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Agendando...' : 'Confirmar Agendamento'}
        </button>
      </div>
    </div>
  );
}

export default NutritionistScheduler;