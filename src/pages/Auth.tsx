import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { passwordSchema, PASSWORD_REQUIREMENTS } from '@/lib/passwordValidation';

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Correo electrónico inválido' }),
  password: z.string().min(1, { message: 'La contraseña es requerida' }),
});

const signupSchema = z.object({
  email: z.string().trim().email({ message: 'Correo electrónico inválido' }),
  nombre: z.string().trim().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }).max(100),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export default function Auth() {
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [checkingUsers, setCheckingUsers] = useState(true);
  const [isFirstUser, setIsFirstUser] = useState(false);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup state (only for first user)
  const [signupNombre, setSignupNombre] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  
  const { signIn, signUp } = useAuth();

  // Check if any users exist using security definer function
  useEffect(() => {
    const checkUsers = async () => {
      try {
        const { data, error } = await supabase.rpc('check_users_exist');
        
        if (error) throw error;
        
        const usersExist = data === true;
        setHasUsers(usersExist);
        setIsFirstUser(!usersExist);
      } catch (error) {
        console.error('Error checking users:', error);
        setHasUsers(true); // Default to login-only on error
      } finally {
        setCheckingUsers(false);
      }
    };
    
    checkUsers();
  }, []);

  // Redirect if already logged in
  if (user && !authLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Credenciales incorrectas. Verifica tu correo y contraseña.');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Tu correo no ha sido confirmado. Revisa tu bandeja de entrada.');
      } else {
        toast.error('Error al iniciar sesión. Intenta de nuevo.');
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signupSchema.safeParse({
      nombre: signupNombre,
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupConfirmPassword,
    });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupNombre);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('Este correo ya está registrado. Intenta iniciar sesión.');
      } else {
        toast.error('Error al registrarse. Intenta de nuevo.');
      }
    } else {
      toast.success('¡Cuenta creada exitosamente! Iniciando sesión...');
    }
  };

  if (authLoading || checkingUsers) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show first user registration form
  if (isFirstUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <span className="text-2xl font-bold">RC</span>
            </div>
            <CardTitle className="text-2xl">Configuración Inicial</CardTitle>
            <CardDescription>Crea tu cuenta de administrador para comenzar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-nombre">Nombre completo</Label>
                <Input
                  id="signup-nombre"
                  type="text"
                  placeholder="Tu nombre"
                  value={signupNombre}
                  onChange={(e) => setSignupNombre(e.target.value)}
                  className="touch-target"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Correo electrónico</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="touch-target"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Contraseña</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Mín. 8 caracteres, mayúscula, minúscula, número"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="touch-target"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-confirm">Confirmar contraseña</Label>
                <Input
                  id="signup-confirm"
                  type="password"
                  placeholder="••••••••"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  className="touch-target"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full touch-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  'Crear Cuenta de Administrador'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login only (no signup tab)
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <span className="text-2xl font-bold">RC</span>
          </div>
          <CardTitle className="text-2xl">RCReyes</CardTitle>
          <CardDescription>Control de Pistas de Radio Control</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Correo electrónico</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="touch-target"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Contraseña</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="touch-target"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full touch-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
