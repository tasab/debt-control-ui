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
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-6 px-4 py-10">
      {/* Знак додатка над карткою: на телефоні форма входу — це весь екран,
          і без нього незрозуміло, куди саме людина вводить пароль. */}
      <div className="flex items-center justify-center gap-2">
        <span
          className="flex size-9 items-center justify-center rounded-xl bg-primary text-lg leading-none font-bold text-primary-foreground"
          aria-hidden
        >
          ₴
        </span>
        <span className="text-lg font-semibold tracking-tight">Debt Control</span>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Вхід</CardTitle>
          <CardDescription>Увійдіть, щоб керувати коштами й заявками.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Пошта</Label>
              <Input
                id="email"
                type="email"
                placeholder="ivan@example.com"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                enterKeyHint="next"
                {...form.register('email')}
              />
              <FieldError message={form.formState.errors.email?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ваш пароль"
                autoComplete="current-password"
                enterKeyHint="go"
                {...form.register('password')}
              />
              <FieldError message={form.formState.errors.password?.message} />
            </div>

            <FieldError message={form.formState.errors.root?.message} />

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
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
