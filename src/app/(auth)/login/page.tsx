import LoginForm from './LoginForm'

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed:
    'Konfirmasi email gagal atau tautan sudah kedaluwarsa. Coba masuk lagi atau kirim ulang email konfirmasi.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const initialError = error
    ? ERROR_MESSAGES[error] ?? 'Terjadi kesalahan autentikasi.'
    : ''

  return <LoginForm key={initialError} initialError={initialError} />
}
