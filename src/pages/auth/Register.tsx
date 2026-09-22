import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Briefcase, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { registerSchema } from '@/lib/schema/forms'
import { applyServerErrors } from '@/lib/formErrors'
import { FieldError } from './Login.tsx'

const MODES = [
  {
    value: 'invest',
    icon: TrendingUp,
    title: 'Інвестувати',
    description: 'Тримати кошти, фінансувати заявки бізнесів і отримувати відсотки.',
  },
  {
    value: 'borrow',
    icon: Briefcase,
    title: 'Залучати кошти',
    description: 'Вести бізнес-профіль і каси, виставляти заявки на залучення.',
  },
]

export default function Register() {
  const { register: registerUser } = useAuth()
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', displayName: '', capability: 'invest' },
  })
  const capability = form.watch('capability')

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await registerUser.mutateAsync(values)
    } catch (error) {
      applyServerErrors(form, error)
    }
  })

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Реєстрація</CardTitle>
          <CardDescription>Оберіть, з чого почнете. Це можна буде розширити пізніше.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">Режим роботи</legend>
              {MODES.map((mode) => (
                <label
                  key={mode.value}
                  className={cn(
                    'cursor-pointer rounded-lg border p-4 transition-colors',
                    capability === mode.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:border-muted-foreground/40',
                  )}
                >
                  <input
                    type="radio"
                    value={mode.value}
                    className="sr-only"
                    {...form.register('capability')}
                  />
                  <mode.icon className="size-5 text-primary" aria-hidden />
                  <div className="mt-2 font-medium">{mode.title}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{mode.description}</p>
                </label>
              ))}
            </fieldset>
            {/* D7: the choice is one capability, not a role — adding the other
                later is an array append, not a new account. */}
            <p className="text-xs text-muted-foreground">
              Обидва режими можна поєднати згодом — обліковий запис не доведеться створювати заново.
            </p>

            <div className="space-y-2">
              <Label htmlFor="displayName">Ім’я</Label>
              <Input
                id="displayName"
                placeholder="Іван Петренко"
                autoComplete="name"
                {...form.register('displayName')}
              />
              <FieldError message={form.formState.errors.displayName?.message} />
            </div>

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
                {...form.register('email')}
              />
              <FieldError message={form.formState.errors.email?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Щонайменше 8 символів"
                autoComplete="new-password"
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
              {form.formState.isSubmitting ? 'Створюємо…' : 'Створити акаунт'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Уже маєте акаунт?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Увійти
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
