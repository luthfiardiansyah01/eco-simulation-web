'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
    } else {
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-80px] left-[-80px] w-64 h-64 rounded-full bg-green-900/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-80px] w-64 h-64 rounded-full bg-teal-900/20 blur-3xl pointer-events-none" />

      <div className="max-w-sm w-full relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-3xl float">🌿</span>
            <h1 className="text-2xl font-bold shimmer-text">EcoSim</h1>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            {isSignUp ? 'Buat akun baru' : 'Masuk untuk melanjutkan'}
          </p>
        </div>

        {/* Card */}
        <div className="eco-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1.5 font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/20 border border-[var(--border-card)] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-green)] focus:ring-1 focus:ring-green-500/20 transition-colors placeholder-gray-600"
                placeholder="kamu@email.com"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1.5 font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-black/20 border border-[var(--border-card)] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-green)] focus:ring-1 focus:ring-green-500/20 transition-colors placeholder-gray-600"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="badge badge-red w-full justify-start py-2 px-3 rounded-lg text-xs">
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="eco-btn-primary w-full py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Memuat...' : isSignUp ? '🌱 Buat Akun' : '▶ Masuk'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-[var(--border-card)] text-center">
            <p className="text-xs text-[var(--text-muted)]">
              {isSignUp ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError('') }}
                className="text-[var(--accent-green)] hover:underline font-medium"
              >
                {isSignUp ? 'Masuk' : 'Daftar'}
              </button>
            </p>
          </div>
        </div>

        <div className="text-center mt-4">
          <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-white transition-colors">
            ← Kembali sebagai tamu
          </Link>
        </div>
      </div>
    </main>
  )
}
