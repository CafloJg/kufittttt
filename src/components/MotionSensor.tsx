import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

function MotionSensor() {
  const [steps, setSteps] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if ('Accelerometer' in window) {
      try {
        const accelerometer = new Accelerometer({ frequency: 60 });
        
        let lastX = 0;
        let lastY = 0;
        let lastZ = 0;
        const threshold = 10;

        accelerometer.addEventListener('reading', () => {
          const deltaX = Math.abs(accelerometer.x - lastX);
          const deltaY = Math.abs(accelerometer.y - lastY);
          const deltaZ = Math.abs(accelerometer.z - lastZ);

          if (deltaX + deltaY + deltaZ > threshold) {
            setSteps(prev => prev + 1);
          }

          lastX = accelerometer.x;
          lastY = accelerometer.y;
          lastZ = accelerometer.z;
        });

        accelerometer.start();
        setIsAvailable(true);
      } catch (error) {
        console.error('Erro ao inicializar acelerômetro:', error);
      }
    }
  }, []);

  if (!isAvailable) return null;

  return (
    <div className="flex items-center gap-2 bg-white p-4 rounded-lg shadow-sm">
      <Activity className="text-primary-500" size={24} />
      <div>
        <p className="text-sm text-gray-600">Passos hoje</p>
        <p className="text-lg font-semibold">{steps}</p>
      </div>
    </div>
  );
}

export default MotionSensor;