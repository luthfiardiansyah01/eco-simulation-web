export type Language = 'id' | 'en'

export const DEFAULT_LANGUAGE: Language = 'id'
export const LANGUAGE_COOKIE = 'ecosim_language'
export const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export type TranslationVars = Record<string, string | number>
export type Translator = (source: string, vars?: TranslationVars) => string

export function normalizeLanguage(value: unknown): Language {
  return value === 'en' ? 'en' : DEFAULT_LANGUAGE
}

/**
 * English copy keyed by the Indonesian source string. Keeping the source as
 * the key makes it easy to add new UI copy without inventing a second naming
 * scheme, and the Indonesian version always remains readable in the code.
 */
const EN: Record<string, string> = {
  // Shared navigation and actions
  '← Kembali ke Menu': '← Back to Menu',
  '← Kembali ke Region': '← Back to Regions',
  '← Kembali ke Daftar Misi': '← Back to Mission List',
  '← Kembali ke Beranda': '← Back to Home',
  '← Kembali ke Masuk': '← Back to Sign In',
  '← Kembali ke halaman masuk': '← Back to sign in',
  '← Kembali sebagai tamu': '← Continue as guest',
  '← Kembali': '← Back',
  'Kembali': 'Back',
  'Kembali ke Beranda': 'Back to Home',
  'Kembali ke Masuk': 'Back to Sign In',
  'Masuk': 'Sign In',
  'Daftar': 'Sign Up',
  'Keluar': 'Sign Out',
  'Profil': 'Profile',
  'Pengaturan': 'Settings',
  'Tutorial': 'Tutorial',
  'Leaderboard': 'Leaderboard',
  'Minta Kode Baru': 'Request a New Code',
  'Coba lagi': 'Try again',
  'Segarkan': 'Refresh',
  'Segera Hadir': 'Coming Soon',
  'Terkunci': 'Locked',
  'SELESAI': 'COMPLETE',
  'MAIN': 'PLAY',
  'TERKUNCI': 'LOCKED',
  'KAMU': 'YOU',
  'DIPILIH': 'SELECTED',
  'Memuat...': 'Loading...',
  'Memuat simulasi...': 'Loading simulation...',
  'Memuat achievement...': 'Loading achievements...',
  'Memuat leaderboard': 'Loading leaderboard',
  'Aktif': 'Active',
  'Nonaktif': 'Disabled',
  'Poin': 'Points',
  'Misi': 'Missions',
  'Wilayah': 'Region',
  'Progres': 'Progress',
  'Kesulitan': 'Difficulty',
  'Peringkat': 'Rank',
  'Tips': 'Tips',
  'Player': 'Player',

  // Home
  'River Ecosystem Simulation': 'River Ecosystem Simulation',
  'Simulasi Ekosistem Sungai': 'River Ecosystem Simulation',
  '— Pilih Mode Simulasi —': '— Choose Simulation Mode —',
  'Selesaikan misi pemulihan ekosistem sungai di 3 wilayah Jawa dengan tantangan lingkungan dinamis.':
    'Complete river ecosystem restoration missions across 3 regions of Java with dynamic environmental challenges.',
  'ONLINE': 'Online',
  'LIVE': 'Live',
  'SULIT': 'Hard',
  'SANTAI': 'Relaxed',
  'Mode Petualangan': 'Adventure Mode',
  'Jelajah Bebas Klasik': 'Classic Free Roam',
  'Biomassa': 'Biomass',
  'Iklim': 'Climate',
  'Dinamis': 'Dynamic',
  '3 Region': '3 Regions',
  '▶ Mulai Petualangan': '▶ Start Adventure',
  'Jelajahi ekosistem secara bebas tanpa objektif. Kreasi sebebasnya seperti sandbox.':
    'Explore the ecosystem freely without objectives. Create as freely as in a sandbox.',
  'Manual': 'Manual',
  'Bebas': 'Free',
  '🔒 Segera Hadir': '🔒 Coming Soon',
  'Selamatkan ekosistem sungai Jawa 🌱': "Save Java's river ecosystems 🌱",
  '⚙️ Pengaturan': '⚙️ Settings',
  '❓ Tutorial': '❓ Tutorial',

  // Region
  'Pilih wilayah untuk memulai misi': 'Choose a region to start a mission',
  'Wilayah {number}': 'Region {number}',
  'Selesaikan region sebelumnya': 'Complete the previous region',
  '✓ SELESAI': '✓ COMPLETE',
  '{completed}/{total} misi': '{completed}/{total} missions',
  '🔒 Terkunci': '🔒 Locked',
  '▶ Lanjutkan': '▶ Continue',
  '▶ Mulai': '▶ Start',
  'Selesaikan semua misi di {region} untuk membuka {next}. Kumpulkan XP sebanyak mungkin!':
    'Complete every mission in {region} to unlock {next}. Earn as much XP as you can!',

  // Mission list
  'Pilih level misi untuk dimulai': 'Choose a mission level to start',
  'Poin Riset': 'Research Points',
  'pts': 'pts',
  'Completion': 'Completion',
  'untuk menyimpan progress dan membuka level berikutnya secara otomatis.':
    'to save progress and unlock the next level automatically.',

  // Briefing
  'Latar Belakang': 'Background',
  'Objektif Misi': 'Mission Objectives',
  'Hadiah': 'Rewards',
  'Tingkat Kesulitan': 'Difficulty',
  'Tingkat kesulitan': 'Difficulty level',
  'Mode {label}': '{label} Mode',
  '☁️ Polusi': '☁️ Pollution',
  '🦋 Bio': '🦋 Bio',
  '💧 Air': '💧 Water',
  '🐟 Ikan': '🐟 Fish',
  '🌳 Pohon': '🌳 Trees',
  '🚁 Drone': '🚁 Drone',
  '💰 Kredit': '💰 Credits',
  '⚡ Energi': '⚡ Energy',
  'Kesulitan hanya memengaruhi kondisi awal dan sumber daya. Objektif dan hadiah tetap sama.':
    'Difficulty only affects the starting conditions and resources. Objectives and rewards stay the same.',
  '▶ Mulai Simulasi': '▶ Start Simulation',

  // Difficulty options
  'Mudah': 'Easy',
  'Ekosistem lebih sehat': 'Healthier ecosystem',
  'Mulai dengan air dan udara yang lebih bersih, populasi ikan lebih tinggi, serta kredit dan energi tambahan.':
    'Start with cleaner water and air, a larger fish population, and extra credits and energy.',
  'Normal': 'Normal',
  'Tantangan seimbang': 'Balanced challenge',
  'Kondisi awal standar. Sumber daya cukup untuk menyelesaikan misi dengan perencanaan yang baik.':
    'Standard starting conditions. With good planning, you have enough resources to complete the mission.',
  'Sulit': 'Hard',
  'Ekosistem kritis': 'Critical ecosystem',
  'Polusi lebih tinggi, ekosistem lebih rapuh, dan sumber daya lebih ketat. Setiap aksi harus direncanakan.':
    'Higher pollution, a more fragile ecosystem, and tighter resources. Every action must be planned.',

  // Gameplay
  'Baterai drone hampir habis': 'Drone battery is almost empty',
  'Ekosistem mulai stabil': 'Ecosystem is stabilizing',
  'Lonjakan polusi terdeteksi': 'Pollution spike detected',
  'Data riset terkumpul': 'Research data collected',
  'Misi direset. Sumber daya dan lingkungan dipulihkan.':
    'Mission reset. Resources and the environment have been restored.',
  'Koneksi gagal saat menyimpan progress. Coba lagi.':
    'Connection failed while saving progress. Try again.',
  'Gagal menyimpan progress. Coba lagi.': 'Failed to save progress. Try again.',
  'Batas penyelesaian misi tercapai. Tunggu sebentar sebelum menyelesaikan misi berikutnya.':
    'Mission completion limit reached. Wait a moment before completing the next mission.',
  'Progress misi tidak valid. Reset misi lalu selesaikan semua objektif sebelum menyimpan.':
    'Mission progress is invalid. Reset the mission and complete every objective before saving.',
  'Fungsi complete_mission belum tersedia. Jalankan migrasi Supabase.':
    'The complete_mission function is not available yet. Run the Supabase migration.',
  'Progress tidak dikembalikan oleh server.':
    'The server did not return mission progress.',
  'Aksi {label} tidak lagi diperlukan untuk objektif.':
    'The {label} action is no longer needed for the objectives.',
  'Sumber daya tidak cukup untuk {label} ({cost}).':
    'Not enough resources for {label} ({cost}).',
  '⏳ Memuat...': '⏳ Loading...',
  '⏳ Menyimpan...': '⏳ Saving...',
  '✓ Progress tersimpan!': '✓ Progress saved!',
  '⚠ Masuk untuk menyimpan progress': '⚠ Sign in to save progress',
  '⚠ Gagal menyimpan progress': '⚠ Failed to save progress',
  'Misi Selesai!': 'Mission Complete!',
  'Gagal menyimpan progress. Coba lagi atau reset misi.':
    'Failed to save progress. Try again or reset the mission.',
  'Level berikutnya': 'Next level',
  'Level {level} 🔓': 'Level {level} 🔓',
  '🔄 Coba Simpan Lagi': '🔄 Try Saving Again',
  'Reset Misi': 'Reset Mission',
  'Lanjut →': 'Continue →',
  'Menu': 'Menu',
  'Misi Gagal': 'Mission Failed',
  'Sumber daya habis sebelum semua objektif tercapai. Reset misi untuk memulihkan sumber daya dan mencoba lagi.':
    'Resources ran out before every objective was completed. Reset the mission to restore resources and try again.',
  '🔄 Reset Misi': '🔄 Reset Mission',
  'Kembali ke Briefing': 'Back to Briefing',
  'Lingkungan': 'Environment',
  'Polusi': 'Pollution',
  'Bio': 'Bio',
  'Air': 'Water',
  'Ikan': 'Fish',
  'Sumber Daya': 'Resources',
  'Objektif': 'Objectives',
  'Log': 'Log',
  'Aksi': 'Actions',
  'Sungai — scan kualitas air': 'River — scan water quality',
  'Area hijau — cocok untuk pohon': 'Green area — suitable for trees',
  'Pohon teridentifikasi': 'Tree identified',
  'Area tercemar — perlu dibersihkan!': 'Polluted area — needs cleanup!',
  'Tanah kosong': 'Empty soil',
  'Tile {type}': 'Tile {type}',
  'Misi sudah berakhir': 'The mission has ended',
  'Target aksi ini sudah tercapai': 'This action target is already complete',
  'Sumber daya tidak cukup': 'Not enough resources',
  'Bersihkan': 'Clean Up',
  'Tanam': 'Plant',
  'Tanam Pohon': 'Plant Tree',
  'Scan Air': 'Scan Water',
  'Filter': 'Filter',
  'Drone': 'Drone',
  'Peta': 'Map',
  'Analisis': 'Analyze',
  'Base': 'Base',
  'Aksi: {label}': 'Action: {label}',
  'Sampah dibersihkan': 'Waste cleaned up',
  'Pohon ditanam ({count}/{target})': 'Tree planted ({count}/{target})',
  'Kualitas air: {quality}%': 'Water quality: {quality}%',
  'Drone diterbangkan ({count}/{target})': 'Drone deployed ({count}/{target})',
  'Filter terpasang — ikan mulai kembali': 'Filter installed — fish are returning',
  'Biodiversitas': 'Biodiversity',
  'Kualitas air': 'Water quality',
  'target': 'target',
  'Sungai': 'River',
  'Tanah': 'Soil',
  'Pohon': 'Trees',
  'Cemar': 'Polluted',

  // Leaderboard
  'Peringkat {rank}': 'Rank {rank}',
  'poin riset': 'research points',
  'Achievement': 'Achievement',
  '{missions} misi · {achievements} achievement · {regions} wilayah':
    '{missions} missions · {achievements} achievements · {regions} regions',
  'Peringkat pemain tunggal': 'Single-player ranking',
  'Peringkat peneliti berdasarkan total poin riset dari misi solo.':
    'Researcher ranking based on total research points from solo missions.',
  'Kamu bermain sebagai tamu': 'You are playing as a guest',
  'Masuk untuk menyimpan progres solo dan tampil di leaderboard.':
    'Sign in to save solo progress and appear on the leaderboard.',
  'Posisi kamu': 'Your position',
  'Peringkat Peneliti': 'Researcher Ranking',
  'Top 50 · diperbarui setelah misi selesai':
    'Top 50 · updated after a mission is completed',
  '↻ Segarkan': '↻ Refresh',
  'Leaderboard tidak tersedia': 'Leaderboard unavailable',
  'Leaderboard belum aktif di server. Terapkan migration leaderboard terlebih dahulu.':
    'The leaderboard is not active on the server yet. Apply the leaderboard migration first.',
  'Gagal memuat leaderboard. Periksa koneksi lalu coba lagi.':
    'Failed to load the leaderboard. Check your connection and try again.',
  'Belum ada peneliti di leaderboard': 'No researchers on the leaderboard yet',
  'Selesaikan misi pertamamu untuk membuka peringkat.':
    'Complete your first mission to open the ranking.',
  'Masuk untuk bergabung': 'Sign in to join',
  'Mulai misi': 'Start a mission',
  'Urutan: total poin riset, misi, pencapaian, lalu wilayah.':
    'Order: total research points, missions, achievements, then regions.',

  // Profile
  'Gagal memuat achievement. Coba muat ulang halaman.':
    'Failed to load achievements. Try reloading the page.',
  'Eco Researcher · VRASS': 'Eco Researcher · VRASS',
  'Status': 'Status',
  'Pencapaian': 'Achievement',
  'Progres Pencapaian': 'Achievement Progress',
  'Daftar Pencapaian': 'Achievement List',
  '✓ UNLOCK': '✓ UNLOCK',

  // Privacy policy
  'Kebijakan Privasi': 'Privacy Policy',
  'Terakhir diperbarui: Oktober 2026': 'Last updated: October 2026',
  '1. Informasi yang Kami Kumpulkan': '1. Information We Collect',
  'VRASS mengumpulkan informasi berikut saat kamu menggunakan aplikasi:':
    'VRASS collects the following information when you use the app:',
  'Alamat email dan nama pengguna saat registrasi akun':
    'Email address and username when registering an account',
  'Data progres permainan (misi selesai, poin riset, pencapaian)':
    'Game progress data (completed missions, research points, achievements)',
  'Preferensi pengaturan aplikasi (volume, bahasa, notifikasi)':
    'App settings preferences (volume, language, notifications)',
  '2. Cara Kami Menggunakan Informasi': '2. How We Use Information',
  'Informasi yang dikumpulkan digunakan untuk:':
    'The information collected is used to:',
  'Menyimpan dan mensinkronisasi progres permainan antar perangkat':
    'Save and sync game progress across devices',
  'Menampilkan leaderboard dan ranking pemain':
    'Display the leaderboard and player rankings',
  'Meningkatkan pengalaman dan performa aplikasi':
    'Improve the app experience and performance',
  '3. Penyimpanan Data': '3. Data Storage',
  'Data pengguna disimpan secara aman menggunakan layanan Supabase dengan enkripsi standar industri. Kami tidak menjual atau membagikan data pribadi kamu kepada pihak ketiga.':
    'User data is stored securely using Supabase with industry-standard encryption. We do not sell or share your personal data with third parties.',
  '4. Hak Pengguna': '4. User Rights',
  'Kamu memiliki hak untuk:': 'You have the right to:',
  'Mengakses data pribadi yang kami simpan':
    'Access the personal data we store',
  'Meminta penghapusan akun dan seluruh data terkait':
    'Request deletion of your account and all related data',
  'Menggunakan aplikasi tanpa membuat akun (mode tamu)':
    'Use the app without creating an account (guest mode)',
  '5. Kebijakan Anak-Anak': "5. Children's Policy",
  'VRASS tidak secara sengaja mengumpulkan data dari pengguna di bawah usia 13 tahun. Jika kamu adalah orang tua dan mengetahui anak kamu telah memberikan informasi pribadi, hubungi kami untuk penghapusan data.':
    'VRASS does not intentionally collect data from users under the age of 13. If you are a parent and learn that your child has provided personal information, contact us to have the data deleted.',
  '6. Kontak': '6. Contact',
  'Jika ada pertanyaan mengenai kebijakan privasi ini, hubungi kami di:':
    'If you have questions about this privacy policy, contact us at:',
  '© 2026 VRASS — Virtual River Awareness Simulation System':
    '© 2026 VRASS — Virtual River Awareness Simulation System',

  // Auth
  'Buat akun baru': 'Create a new account',
  'Masuk untuk melanjutkan': 'Sign in to continue',
  'Email': 'Email',
  'kamu@email.com': 'you@email.com',
  'Password': 'Password',
  'Lupa password?': 'Forgot password?',
  '🌱 Buat Akun': '🌱 Create Account',
  '▶ Masuk': '▶ Sign In',
  'Sudah punya akun?': 'Already have an account?',
  'Belum punya akun?': "Don't have an account?",
  'Akun dibuat. Cek email kamu dan klik tautan konfirmasi untuk mulai bermain.':
    'Account created. Check your email and click the confirmation link to start playing.',
  'Terjadi kesalahan. Coba lagi.': 'Something went wrong. Try again.',
  'Pulihkan akses ke akunmu': 'Recover access to your account',
  'Masukkan kode verifikasi': 'Enter the verification code',
  '1 Email': '1 Email',
  '2 Kode': '2 Code',
  '3 Password': '3 Password',
  'Email akun': 'Account email',
  '✉️ Kirim Kode Verifikasi': '✉️ Send Verification Code',
  '⏳ Mengirim...': '⏳ Sending...',
  'Kode dikirim ke': 'Code sent to',
  'Ubah email': 'Change email',
  'Kode 6 digit': '6-digit code',
  '🔐 Verifikasi Kode': '🔐 Verify Code',
  '⏳ Memverifikasi...': '⏳ Verifying...',
  'Kirim ulang dalam {seconds} detik': 'Resend in {seconds} seconds',
  'Kirim ulang kode': 'Resend code',
  'Buat password baru untuk akunmu': 'Create a new password for your account',
  'Password baru': 'New password',
  'Minimal 6 karakter': 'At least 6 characters',
  'Konfirmasi password': 'Confirm password',
  'Ulangi password baru': 'Repeat the new password',
  'Tampilkan password': 'Show password',
  '🔐 Simpan Password Baru': '🔐 Save New Password',
  'Password minimal 6 karakter.': 'Password must be at least 6 characters.',
  'Konfirmasi password tidak cocok.': 'Password confirmation does not match.',
  'Password berhasil diperbarui. Mengalihkan ke halaman masuk...':
    'Password updated. Redirecting to the sign-in page...',
  'Kode tidak valid atau sudah kedaluwarsa. Coba kirim ulang kode.':
    'The code is invalid or has expired. Try resending the code.',
  'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.':
    'Too many attempts. Wait a moment and try again.',
  'Sesi reset sudah tidak valid. Minta kode verifikasi baru.':
    'The reset session is no longer valid. Request a new verification code.',
  'Password baru harus berbeda dari password lama.':
    'The new password must be different from the old password.',
  'Password terlalu lemah atau terlalu pendek.':
    'The password is too weak or too short.',
  'Password tidak memenuhi syarat.': 'The password does not meet the requirements.',
  'Masukkan kode verifikasi 6 digit dari email.':
    'Enter the 6-digit verification code from your email.',
  'Kode baru telah dikirim ke {email}.': 'A new code was sent to {email}.',
  'Kode verifikasi 6 digit telah dikirim ke {email}. Cek inbox dan folder spam.':
    'A 6-digit verification code was sent to {email}. Check your inbox and spam folder.',

  // Auth route messages and error boundaries
  'Konfirmasi email gagal atau tautan sudah kedaluwarsa. Coba masuk lagi atau kirim ulang email konfirmasi.':
    'Email confirmation failed or the link has expired. Try signing in again or resend the confirmation email.',
  'Password berhasil diperbarui. Masuk dengan password baru.':
    'Password updated successfully. Sign in with your new password.',
  'Terjadi kesalahan autentikasi.': 'An authentication error occurred.',
  'Halaman masuk gagal dimuat': 'Sign-in page failed to load',
  'Terjadi kesalahan saat memuat form masuk. Coba lagi atau kembali ke beranda.':
    'An error occurred while loading the sign-in form. Try again or return to the home page.',
  'Halaman pemulihan gagal dimuat': 'Recovery page failed to load',
  'Terjadi kesalahan saat memuat form pemulihan password. Coba lagi atau kembali ke halaman masuk.':
    'An error occurred while loading the password recovery form. Try again or return to the sign-in page.',
  'Tautan atau kode reset tidak valid atau sudah kedaluwarsa. Minta kode baru.':
    'The reset link or code is invalid or has expired. Request a new code.',
  'Sesi reset tidak ditemukan. Masukkan email dan minta kode verifikasi baru.':
    'The reset session was not found. Enter your email and request a new verification code.',
  'Halaman reset password gagal dimuat': 'Reset password page failed to load',
  'Terjadi kesalahan saat memuat form password baru. Coba lagi atau minta kode verifikasi baru.':
    'An error occurred while loading the new password form. Try again or request a new verification code.',
  'Halaman autentikasi gagal dimuat': 'Authentication page failed to load',
  'Terjadi kesalahan saat memuat halaman masuk atau pemulihan password. Coba lagi, atau kembali ke halaman masuk.':
    'An error occurred while loading the sign-in or password recovery page. Try again, or return to the sign-in page.',
  'Tautan reset harus dibuka di browser yang sama dengan saat meminta reset. Minta kode baru dari browser ini, atau gunakan kode 6 digit.':
    'The reset link must be opened in the same browser used to request the reset. Request a new code from this browser, or use the 6-digit code.',
  'Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan atau kode baru.':
    'The reset link is invalid or has expired. Request a new link or code.',
  'Tautan reset tidak memuat token yang valid. Minta tautan atau kode baru.':
    'The reset link does not contain a valid token. Request a new link or code.',
  'Terjadi kesalahan saat memproses tautan reset. Coba lagi.':
    'An error occurred while processing the reset link. Try again.',
  'Memverifikasi tautan reset...': 'Verifying reset link...',
  'Mohon tunggu sebentar.': 'Please wait a moment.',
  'Tautan reset tidak dapat digunakan': 'The reset link cannot be used',
  'Tautan reset gagal diproses': 'Reset link failed to process',
  'Terjadi kesalahan saat memproses tautan reset. Minta kode verifikasi baru atau kembali ke halaman masuk.':
    'An error occurred while processing the reset link. Request a new verification code or return to the sign-in page.',

  // Error fallback
  'Terjadi kesalahan': 'Something went wrong',
  'Terjadi kesalahan — VRASS': 'Something went wrong — VRASS',
  'Halaman gagal dimuat': 'Page failed to load',
  'Terjadi kesalahan saat memuat halaman autentikasi. Coba lagi atau kembali ke halaman masuk.':
    'An error occurred while loading the authentication page. Try again or return to the sign-in page.',
  'Halaman gagal dimuat karena kesalahan yang tidak terduga. Coba muat ulang halaman atau kembali ke beranda.':
    'The page failed to load due to an unexpected error. Try reloading the page or return to the home page.',
  'Kode kesalahan: {digest}': 'Error code: {digest}',
  '🔄 Coba Lagi': '🔄 Try Again',
  'Aplikasi gagal dimuat. Coba lagi, atau kembali ke beranda.':
    'The app failed to load. Try again, or return to the home page.',

  // Sound
  'Aktifkan suara & musik': 'Enable sound & music',
  'Matikan suara & musik': 'Mute sound & music',
  'PENCAPAIAN TERBUKA': 'ACHIEVEMENT UNLOCKED',

  // Settings
  'Atur tampilan, audio, bahasa, dan notifikasi':
    'Manage appearance, audio, language, and notifications',
  'Tampilan': 'Appearance',
  'Pilih tema gelap atau terang untuk antarmuka.':
    'Choose a dark or light theme for the interface.',
  'Gelap': 'Dark',
  'Terang': 'Light',
  'Audio': 'Audio',
  'Volume berlaku untuk efek suara dan ambience permainan.':
    'Volume applies to sound effects and gameplay ambience.',
  'Volume': 'Volume',
  'Bisukan semua suara': 'Mute all sound',
  'Aktifkan suara': 'Enable sound',
  'Uji suara': 'Test sound',
  'Suara sedang dibisukan.': 'Sound is currently muted.',
  'Bahasa': 'Language',
  'Preferensi bahasa disimpan di perangkat ini dan diterapkan ke seluruh aplikasi.':
    'The language preference is saved on this device and applied throughout the app.',
  'Bahasa Indonesia': 'Bahasa Indonesia',
  'English': 'English',
  'Notifikasi': 'Notifications',
  'Tampilkan notifikasi pencapaian saat misi selesai.':
    'Show achievement notifications when a mission is completed.',
  'Tampilkan notifikasi uji': 'Show test notification',
  'Notifikasi pengaturan': 'Settings notification',
  'Preferensi notifikasi tersimpan di perangkat ini.':
    'Notification preferences are saved on this device.',
  'Perubahan tersimpan otomatis di perangkat ini.':
    'Changes are saved automatically on this device.',

  // Onboarding
  'Selamat Datang di VRASS!': 'Welcome to VRASS!',
  'Kamu adalah Ranger lingkungan yang bertugas memulihkan ekosistem sungai di Pulau Jawa. Setiap keputusanmu menentukan nasib alam.':
    'You are an environmental Ranger tasked with restoring river ecosystems on the island of Java. Every decision you make shapes the fate of nature.',
  'Pilih Mode Petualangan': 'Choose Adventure Mode',
  'Klik kartu Mode Petualangan di halaman utama untuk memulai petualangan. Selesaikan misi di 3 wilayah: Bandung, Semarang, dan Surabaya.':
    'Click the Adventure Mode card on the home page to begin. Complete missions in 3 regions: Bandung, Semarang, and Surabaya.',
  '💡 Jelajah Bebas Klasik akan hadir segera!': '💡 Classic Free Roam is coming soon!',
  'Pilih Wilayah': 'Choose a Region',
  'Setiap wilayah punya tantangan unik. Mulai dari Bandung — selesaikan semua level untuk membuka wilayah berikutnya.':
    'Each region has a unique challenge. Start in Bandung — complete every level to unlock the next region.',
  '🔒 Wilayah terkunci akan terbuka saat kamu menyelesaikan region sebelumnya.':
    '🔒 Locked regions open when you complete the previous region.',
  'Baca Briefing Misi': 'Read the Mission Briefing',
  'Setiap misi punya cerita, objektif, dan reward. Baca baik-baik sebelum memulai simulasi agar kamu tahu apa yang harus dilakukan.':
    'Every mission has a story, objectives, and rewards. Read carefully before starting the simulation so you know what to do.',
  '🎯 Objektif adalah target yang harus dicapai untuk menyelesaikan misi.':
    '🎯 Objectives are the targets you must reach to complete the mission.',
  'Panel Status (Kiri)': 'Status Panel (Left)',
  'Di layar gameplay, panel kiri menampilkan kondisi lingkungan: Polusi, Biodiversitas, Kualitas Air, dan Populasi Ikan. Pantau terus agar tidak melewatkan peringatan!':
    'During gameplay, the left panel shows environmental conditions: Pollution, Biodiversity, Water Quality, and Fish Population. Keep watching so you do not miss any warnings!',
  '⚠️ Bar merah = kondisi kritis, segera ambil tindakan!':
    '⚠️ Red bar = critical condition, take action immediately!',
  'Peta Isometrik (Tengah)': 'Isometric Map (Center)',
  'Peta menunjukkan kondisi area secara visual. Area coklat = tercemar, biru = sungai bersih, hijau = vegetasi sehat. Sentuh tile untuk info lebih lanjut.':
    'The map shows the area visually. Brown = polluted, blue = clean river, green = healthy vegetation. Tap a tile for more information.',
  '🌊 Semakin biru peta, semakin bersih ekosistemmu!':
    '🌊 The bluer the map, the cleaner your ecosystem!',
  'Panel Aksi (Kanan)': 'Action Panel (Right)',
  'Gunakan aksi untuk memulihkan ekosistem:\n🗑️ Bersihkan — kurangi polusi\n🌱 Tanam Pohon — tambah biodiversitas\n💧 Filter — jernihkan air & kembalikan ikan\n🚁 Drone — kirim drone survei':
    'Use actions to restore the ecosystem:\n🗑️ Clean Up — reduce pollution\n🌱 Plant Tree — increase biodiversity\n💧 Filter — clean the water & bring fish back\n🚁 Drone — send a survey drone',
  '💰 Setiap aksi butuh Kredit atau Energi. Kelola dengan bijak!':
    '💰 Every action costs Credits or Energy. Manage them wisely!',
  'Raih Pencapaian!': 'Earn Achievements!',
  'Selesaikan misi untuk mengumpulkan Poin Riset dan membuka Pencapaian. Naikkan peringkat dari Recruit hingga Eco Master!':
    'Complete missions to collect Research Points and unlock Achievements. Rank up from Recruit to Eco Master!',
  '🌱 Rank tertinggi: Eco Master (80%+ achievement)':
    '🌱 Highest rank: Eco Master (80%+ achievements)',
  '3 Wilayah · Dinamis': '3 Regions · Dynamic',
  'Bandung': 'Bandung',
  'Semarang': 'Semarang',
  'Surabaya': 'Surabaya',
  'Kurangi polusi ≤20%': 'Reduce pollution ≤20%',
  'Pulihkan populasi ikan ≥60%': 'Restore fish population ≥60%',
  'Tanam 50 pohon': 'Plant 50 trees',
  '🔵 Air': '🔵 Water',
  '🟢 Hijau': '🟢 Green',
  '🟤 Cemar': '🟤 Polluted',
  'Lewati': 'Skip',
  '🌿 Mulai Bermain!': '🌿 Start Playing!',
  'Hijau': 'Green',

  // Metadata
  'Adventure game simulasi ekosistem sungai. Selesaikan misi pemulihan lingkungan di 3 wilayah Jawa.':
    'River ecosystem simulation adventure game. Complete environmental restoration missions across 3 regions of Java.',
  'Kebijakan Privasi — VRASS': 'Privacy Policy — VRASS',
  'Privacy Policy for VRASS River Awareness Simulation System':
    'Privacy Policy for VRASS River Awareness Simulation System',
}

export function translate(
  language: Language,
  source: string,
  vars?: TranslationVars
): string {
  const template = language === 'en' ? EN[source] ?? source : source
  if (!vars) return template

  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key)
      ? String(vars[key])
      : `{${key}}`
  )
}

export function createTranslator(language: Language): Translator {
  return (source, vars) => translate(language, source, vars)
}

export function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US').format(value)
}

export function formatDate(value: string | number | Date, language: Language): string {
  return new Date(value).toLocaleDateString(
    language === 'id' ? 'id-ID' : 'en-US'
  )
}
