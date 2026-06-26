import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button, Card, CardContent, Input } from '@/components/ui';
import { useDocumentTitle } from '@/lib/use-document-title';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAuth } from './useAuth';

const schema = z.object({
  email: z.string().email('Adresse email invalide.'),
  password: z.string().min(1, 'Mot de passe requis.'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  useDocumentTitle('Connexion');
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (error) {
      setServerError(
        isAxiosError(error)
          ? getApiErrorMessage(error, 'Identifiants incorrects.')
          : error instanceof Error
            ? error.message
            : 'Erreur de connexion.',
      );
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img
            src="/logo-mark.png"
            alt="HangOutHub"
            className="h-12 w-12 rounded-xl object-contain"
          />
          <div>
            <h1 className="text-xl font-semibold">HangOutHub Admin</h1>
            <p className="text-sm text-muted-foreground">
              Espace réservé aux administrateurs.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@hangouthub.app"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium">
                  Mot de passe
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              {serverError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </div>
              )}

              <Button type="submit" className="w-full" loading={isSubmitting}>
                Se connecter
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
