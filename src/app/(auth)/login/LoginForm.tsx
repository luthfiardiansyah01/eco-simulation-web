'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSound } from '@/components/audio/SoundProvider'

export default function LoginForm({
  initialError = '',
  initialMessage = '',
}: {
  initialError?: string
  initialMessage?: string
}) {
  const router = useRouter()
  const { play } = useSound()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState(initialError)
  const [message, setMessage] = useState(initialMessage)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    play('click')
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const supabase = createClient()

      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
          },
        })

        if (signUpError) {
          setError(signUpError.message)
          play('error')
          return
        }

        // Email confirmation is enabled, so Supabase intentionally returns no
        // session until the user clicks the link in their inbox.
        if (!data.session) {
          setMessage(
            'Akun dibuat. Cek email kamu dan klik tautan konfirmasi untuk mulai bermain.'
          )
          setIsSignUp(false)
          play('success')
          return
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          setError(signInError.message)
          play('error')
          return
        }
      }

      play('success')
      router.push('/')
      router.refresh()
    } catch (err) {
      console.error('Auth request failed:', err)
      setError('Terjadi kesalahan. Coba lagi.')
      play('error')
    } finally {
      setLoading(false)
    }
  }

  function toggleMode() {
    play('click')
    setIsSignUp((current) => !current)
    setError('')
    setMessage('')
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
                autoComplete="email"
                className="w-full bg-[var(--input-bg)] border border-[var(--border-card)] rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-[var(--accent-green)] focus:ring-1 focus:ring-green-500/20 transition-colors placeholder:text-[var(--text-muted)]"
                placeholder="kamu@email.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[var(--text-muted)] font-medium">Password</label>
                {!isSignUp && (
                  <Link
                    href="/forgot-password"
                    onClick={() => play('click')}
                    className="text-[10px] text-[var(--accent-teal)] hover:underline"
                  >
                    Lupa password?
                  </Link>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-card)] rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-[var(--accent-green)] focus:ring-1 focus:ring-green-500/20 transition-colors placeholder:text-[var(--text-muted)]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="badge badge-red w-full justify-start py-2 px-3 rounded-lg text-xs"
              >
                ⚠ {error}
              </div>
            )}

            {message && (
              <div
                role="status"
                className="badge badge-green w-full justify-start py-2 px-3 rounded-lg text-xs leading-relaxed"
              >
                ✓ {message}
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
                type="button"
                onClick={toggleMode}
                className="text-[var(--accent-green)] hover:underline font-medium"
              >
                {isSignUp ? 'Masuk' : 'Daftar'}
              </button>
            </p>
          </div>
        </div>

        <div className="text-center mt-4">
          <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-foreground transition-colors" onClick={() => play('click')}>
            ← Kembali sebagai tamu
          </Link>
        </div>
      </div>
    </main>
  )
}
