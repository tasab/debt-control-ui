import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth'
import { loginSchema } from '@/lib/schema/forms'
import { applyServerErrors } from '@/lib/formErrors'

export default function Login() {
  const { login } = useAuth()
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values)
    } catch (error) {
      applyServerErrors(form, error)
    }
  })

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Вхід</CardTitle>
          <CardDescription>Увійдіть, щоб керувати коштами й заявками.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Пошта</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
              <FieldError message={form.formState.errors.email?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
              <FieldError message={form.formState.errors.password?.message} />
            </div>

            <FieldError message={form.formState.errors.root?.message} />

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Входимо…' : 'Увійти'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Ще немає акаунта?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Зареєструватися
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function FieldError({ message }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}
