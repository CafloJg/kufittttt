import { useState, useCallback } from 'react';
import { z } from 'zod';

interface UseFormOptions<T> {
  /**
   * Valores iniciais do formulário
   */
  initialValues: T;
  
  /**
   * Esquema de validação Zod
   */
  validationSchema?: z.ZodType<T>;
  
  /**
   * Callback para submissão do formulário
   */
  onSubmit?: (values: T) => void | Promise<void>;
}

/**
 * Hook para gerenciar formulários com validação Zod
 */
export function useForm<T extends Record<string, any>>({
  initialValues,
  validationSchema,
  onSubmit
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  
  // Validar o formulário
  const validate = useCallback((data: T): boolean => {
    if (!validationSchema) return true;
    
    try {
      validationSchema.parse(data);
      setErrors({});
      setIsValid(true);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof T, string>> = {};
        
        error.errors.forEach((err) => {
          const path = err.path[0] as keyof T;
          newErrors[path] = err.message;
        });
        
        setErrors(newErrors);
        setIsValid(false);
        return false;
      }
      
      setIsValid(false);
      return false;
    }
  }, [validationSchema]);
  
  // Atualizar um campo
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    setValues(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? Number(value) : '') : value
    }));
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  }, []);
  
  // Atualizar um campo diretamente
  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);
  
  // Marcar um campo como tocado
  const handleBlur = useCallback((
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    validate(values);
  }, [validate, values]);
  
  // Submeter o formulário
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    setTouched(
      Object.keys(values).reduce((acc, key) => {
        acc[key as keyof T] = true;
        return acc;
      }, {} as Record<keyof T, boolean>)
    );
    
    const isValidForm = validate(values);
    
    if (isValidForm && onSubmit) {
      setIsSubmitting(true);
      
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [validate, values, onSubmit]);
  
  // Resetar o formulário
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);
  
  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    setValue,
    reset
  };
}