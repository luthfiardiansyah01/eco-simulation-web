import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — VRASS',
  description: 'Privacy Policy for VRASS River Awareness Simulation System',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors mb-6">
          ← Kembali ke Menu
        </Link>

        <div className="eco-card p-6 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🔒</span>
            <div>
              <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
              <p className="text-xs text-[var(--text-muted)]">VRASS — Virtual River Awareness Simulation System</p>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)]">Terakhir diperbarui: Oktober 2026</p>
        </div>

        <div className="space-y-4 text-sm text-[var(--text-muted)] leading-relaxed">

          <section className="eco-card p-5">
            <h2 className="text-sm font-semibold text-[var(--accent-green)] uppercase tracking-wide mb-3">1. Informasi yang Kami Kumpulkan</h2>
            <p>VRASS mengumpulkan informasi berikut saat kamu menggunakan aplikasi:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Alamat email dan nama pengguna saat registrasi akun</li>
              <li>Data progres permainan (misi selesai, research points, achievement)</li>
              <li>Preferensi pengaturan aplikasi (volume, bahasa, notifikasi)</li>
            </ul>
          </section>

          <section className="eco-card p-5">
            <h2 className="text-sm font-semibold text-[var(--accent-teal)] uppercase tracking-wide mb-3">2. Cara Kami Menggunakan Informasi</h2>
            <p>Informasi yang dikumpulkan digunakan untuk:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Menyimpan dan mensinkronisasi progres permainan antar perangkat</li>
              <li>Menampilkan leaderboard dan ranking pemain</li>
              <li>Meningkatkan pengalaman dan performa aplikasi</li>
            </ul>
          </section>

          <section className="eco-card p-5">
            <h2 className="text-sm font-semibold text-[var(--accent-amber)] uppercase tracking-wide mb-3">3. Penyimpanan Data</h2>
            <p>Data pengguna disimpan secara aman menggunakan layanan Supabase dengan enkripsi standar industri. Kami tidak menjual atau membagikan data pribadi kamu kepada pihak ketiga.</p>
          </section>

          <section className="eco-card p-5">
            <h2 className="text-sm font-semibold text-[var(--accent-green)] uppercase tracking-wide mb-3">4. Hak Pengguna</h2>
            <p>Kamu memiliki hak untuk:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Mengakses data pribadi yang kami simpan</li>
              <li>Meminta penghapusan akun dan seluruh data terkait</li>
              <li>Menggunakan aplikasi tanpa membuat akun (mode tamu)</li>
            </ul>
          </section>

          <section className="eco-card p-5">
            <h2 className="text-sm font-semibold text-[var(--accent-teal)] uppercase tracking-wide mb-3">5. Kebijakan Anak-Anak</h2>
            <p>VRASS tidak secara sengaja mengumpulkan data dari pengguna di bawah usia 13 tahun. Jika kamu adalah orang tua dan mengetahui anak kamu telah memberikan informasi pribadi, hubungi kami untuk penghapusan data.</p>
          </section>

          <section className="eco-card p-5">
            <h2 className="text-sm font-semibold text-[var(--accent-amber)] uppercase tracking-wide mb-3">6. Kontak</h2>
            <p>Jika ada pertanyaan mengenai kebijakan privasi ini, hubungi kami di:</p>
            <p className="mt-2 text-[var(--accent-green)] font-medium">sailashop24@gmail.com</p>
          </section>

        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-8">
          © 2026 VRASS — Virtual River Awareness Simulation System
        </p>
      </div>
    </main>
  )
}
