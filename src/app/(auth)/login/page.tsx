import LoginForm from './LoginForm'

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed:
    'Konfirmasi email gagal atau tautan sudah kedaluwarsa. Coba masuk lagi atau kirim ulang email konfirmasi.',
}

const STATUS_MESSAGES: Record<string, string> = {
  password_updated: 'Password berhasil diperbarui. Masuk dengan password baru.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams
  const initialError = error
    ? ERROR_MESSAGES[error] ?? 'Terjadi kesalahan autentikasi.'
    : ''
  const initialMessage = message ? STATUS_MESSAGES[message] ?? '' : ''

  return (
    <LoginForm
      key={`${initialError}-${initialMessage}`}
      initialError={initialError}
      initialMessage={initialMessage}
    />
  )
}
