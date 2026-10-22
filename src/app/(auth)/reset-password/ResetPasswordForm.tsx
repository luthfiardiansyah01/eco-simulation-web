'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSound } from '@/components/audio/SoundProvider'

function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes('expired') || normalized.includes('invalid')) {
    return 'Sesi reset sudah tidak valid. Minta kode verifikasi baru.'
  }
  if (normalized.includes('different from the old')) {
    return 'Password baru harus berbeda dari password lama.'
  }
  if (normalized.includes('weak') || normalized.includes('short')) {
    return 'Password terlalu lemah atau terlalu pendek.'
  }
  if (normalized.includes('password')) {
    return 'Password tidak memenuhi syarat.'
  }
  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
  }
  return message
}

export default function ResetPasswordForm({ email }: { email: string }) {
  const router = useRouter()
  const { play } = useSound()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    play('click')
    setError('')
    setMessage('')

    if (password.length < 6) {
      setError('Password minimal 6 karakter.')
      play('error')
      return
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.')
      play('error')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError(friendlyAuthError(updateError.message))
        play('error')
        return
      }

      play('success')
      setMessage('Password berhasil diperbarui. Mengalihkan ke halaman masuk...')

      try {
        await supabase.auth.signOut()
      } catch {
        // The password has already changed; continue to the login screen.
      }

      router.replace('/login?message=password_updated')
      router.refresh()
    } catch (err) {
      console.error('Password update failed:', err)
      setError('Terjadi kesalahan. Coba lagi.')
      play('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-80px] left-[-80px] w-64 h-64 rounded-full bg-green-900/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-80px] w-64 h-64 rounded-full bg-teal-900/20 blur-3xl pointer-events-none" />

      <div className="max-w-sm w-full relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-3xl float">🌿</span>
            <h1 className="text-2xl font-bold shimmer-text">EcoSim</h1>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Buat password baru untuk akunmu
          </p>
        </div>

        <div className="eco-card p-6">
          <div className="flex items-center justify-center gap-1.5 mb-5 text-[9px]">
            <span className="text-[var(--accent-green)] font-semibold">1 Email</span>
            <span className="text-[var(--text-muted)]">→</span>
            <span className="text-[var(--accent-green)] font-semibold">2 Kode</span>
            <span className="text-[var(--text-muted)]">→</span>
            <span className="text-[var(--accent-green)] font-semibold">3 Password</span>
          </div>

          <p className="text-[10px] text-[var(--text-muted)] text-center mb-4 break-all">
            {email}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1.5 font-medium">
                Password baru
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                autoFocus
                className="w-full bg-[var(--input-bg)] border border-[var(--border-card)] rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-[var(--accent-green)] focus:ring-1 focus:ring-green-500/20 transition-colors placeholder:text-[var(--text-muted)]"
                placeholder="Minimal 6 karakter"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1.5 font-medium">
                Konfirmasi password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full bg-[var(--input-bg)] border border-[var(--border-card)] rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-[var(--accent-green)] focus:ring-1 focus:ring-green-500/20 transition-colors placeholder:text-[var(--text-muted)]"
                placeholder="Ulangi password baru"
              />
            </div>

            <label className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="accent-[var(--accent-green)]"
              />
              Tampilkan password
            </label>

            {error && (
              <div
                role="alert"
                className="badge badge-red w-full justify-start py-2 px-3 rounded-lg text-xs leading-relaxed"
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
              {loading ? '⏳ Menyimpan...' : '🔐 Simpan Password Baru'}
            </button>
          </form>
        </div>

        <div className="text-center mt-4">
          <Link
            href="/login"
            className="text-xs text-[var(--text-muted)] hover:text-foreground transition-colors"
            onClick={() => play('click')}
          >
            ← Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    </main>
  )
}
