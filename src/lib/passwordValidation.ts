import { z } from 'zod';

/**
 * Password validation requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export const passwordSchema = z
  .string()
  .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  .regex(/[A-Z]/, { message: 'La contraseña debe incluir al menos una letra mayúscula' })
  .regex(/[a-z]/, { message: 'La contraseña debe incluir al menos una letra minúscula' })
  .regex(/[0-9]/, { message: 'La contraseña debe incluir al menos un número' });

export const PASSWORD_REQUIREMENTS = [
  'Mínimo 8 caracteres',
  'Al menos una letra mayúscula',
  'Al menos una letra minúscula',
  'Al menos un número',
];

/**
 * Validates a password and returns an error message if invalid
 */
export function validatePassword(password: string): string | null {
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    return result.error.errors[0].message;
  }
  return null;
}
