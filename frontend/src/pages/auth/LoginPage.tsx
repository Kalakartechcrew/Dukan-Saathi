import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordField } from '@/components/auth/PasswordField'
import { useAuthStore } from '@/stores/authStore'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

type Form = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: Form) => {
    setLoading(true)
    try {
      const { data: tokens } = await api.post('/auth/login', data)
      const { data: user } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      setAuth(user, tokens.access_token, tokens.refresh_token)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(detail || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-12 text-white lg:flex"
      >
        <div>
          <h1 className="text-4xl font-bold">Dukan Saathi</h1>
          <p className="mt-2 text-indigo-100">Your intelligent shop companion</p>
        </div>
        <p className="text-lg text-indigo-100">
          Inventory, billing, POS & analytics — built for every shopkeeper.
        </p>
      </motion.div>
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-md">
          <h2 className="text-3xl font-bold">Sign in</h2>
          <p className="mt-2 text-slate-500">Manage your shop smarter</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
            <PasswordField
              label="Password"
              visible={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              error={errors.password?.message}
              registration={register('password')}
            />
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-indigo-600 hover:underline">Forgot password?</Link>
            </div>
            <Button type="submit" className="w-full" loading={loading} tooltip="Sign in to your shop dashboard.">Sign in</Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            New here? <Link to="/signup" className="font-medium text-indigo-600 hover:underline">Create account</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
