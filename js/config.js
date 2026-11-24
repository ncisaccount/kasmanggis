/**
 * =========================================================================
 * ManggisKas Desa - Global Configuration (config.js)
 * Sesuai Standar Skill: gas-pro-api, gas-rahasia-script-properties
 * 
 * Aturan Penting:
 * - File ini hanya memuat konfigurasi publik (GAS_URL, nama instansi, dll).
 * - Tidak ada token rahasia, password, atau API key pihak ketiga di sini.
 * - Jika GAS_URL kosong atau belum dideploy, aplikasi otomatis berjalan 
 *   dalam Mode Interaktif / Demo Terhubung dengan LocalStorage secara instan!
 * =========================================================================
 */

const APP_CONFIG = {
  APP_NAME: 'ManggisKas Desa',
  APP_SUBTITLE: 'Sistem Keuangan Panen BUMDes Manggis Jaya Mandiri',
  DESA_NAME: 'Desa Puspahiang, Kec. Puspahiang, Tasikmalaya',
  VERSION: '2.1.0',
  
  // URL Web App Google Apps Script setelah dideploy (Execute as: Me, Access: Anyone)
  // Ganti URL berikut dengan Web App URL proyek GAS Anda:
  GAS_URL: 'https://script.google.com/macros/s/AKfycbwNh3SDUmP5R57e1kGfXEML19MBnivyCCkXO1-wc59s5Hsts0lqK2d9jtZte9fE0WXb/exec', 

  // Durasi cache client-side SWR (detik)
  CACHE_TTL: 300,

  // SOP Desa: Batas nominal yang mewajibkan bukti nota fisik
  BATAS_WAJIB_NOTA: 200000,

  // Akun Demo Bawaan untuk Uji Coba Cepat (1-Klik)
  DEMO_ACCOUNTS: {
    bendahara: {
      username: 'bendahara.puspahiang',
      password: 'bendahara123',
      nama: 'Siti Rahma, S.Ak',
      role: 'Bendahara',
      jabatan: 'Bendahara Utama BUMDes'
    },
    koordinator: {
      username: 'ahmad.pratama',
      password: 'koordinator123',
      nama: 'Ahmad Pratama',
      role: 'Koordinator',
      jabatan: 'Koordinator Lapangan & Verifikator'
    }
  }
};

// Ambil GAS_URL yang tersimpan di LocalStorage jika pengguna pernah memasukkannya lewat UI Pengaturan
(function initGasUrlFromStorage() {
  const savedUrl = localStorage.getItem('manggiskas_gas_url');
  if (savedUrl && savedUrl.trim().startsWith('https://script.google.com/')) {
    APP_CONFIG.GAS_URL = savedUrl.trim();
  }
})();
