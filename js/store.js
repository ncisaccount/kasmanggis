/**
 * =========================================================================
 * ManggisKas Desa - Reactive Local State Store (store.js)
 * Sesuai Standar Skill: gas-scale-turbo, gas-rahasia-script-properties
 * 
 * Fitur:
 * - Single Source of Truth dengan sinkronisasi instan ke LocalStorage.
 * - Reactive Subscription Pattern untuk update UI tanpa reload & 0ms delay.
 * - Kalkulasi otomatis metrik finansial desa (Laba Bersih, Selisih, Efisiensi Upah).
 * - Data bawaan komprehensif yang 100% identik dengan PRD & UI Referensi Stitch.
 * =========================================================================
 */

const Store = (function () {
  const STORAGE_KEY = 'manggiskas_db_v2';
  const TOKEN_KEY = 'manggiskas_auth_token';
  const USER_KEY = 'manggiskas_current_user';

  const _subscribers = [];

  // Data Awal Bawaan (Seed Data Terverifikasi Sesuai Desain & PRD)
  const defaultState = {
    panenList: [
      {
        id: 'PNN-2026-0001',
        faktur: 'FKT-MG-2026-102',
        tanggal: '2026-08-24 14:30 WIB',
        blokKebun: 'Blok Cikadu Atas',
        grade: 'Grade Super Export A',
        pengepul: 'CV Manggis Buana Nusantara',
        pengepulId: 'V-0881',
        beratKg: 1250,
        hargaKg: 15000,
        totalJual: 18750000,
        disetor: 18750000,
        selisih: 0,
        status: 'Lunas',
        statusAudit: 'Disetujui',
        keterangan: 'Timbang netto lunas pas transfer rekening desa',
        notaUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        petugas: 'Ahmad Pratama'
      },
      {
        id: 'PNN-2026-0002',
        faktur: 'FKT-MG-2026-101',
        tanggal: '2026-08-23 11:15 WIB',
        blokKebun: 'Blok Pasir Wangi',
        grade: 'Grade B (Lokal & Sirup)',
        pengepul: 'UD Berkah Tani Subur',
        pengepulId: 'V-0294',
        beratKg: 820,
        hargaKg: 10000,
        totalJual: 8200000,
        disetor: 7950000,
        selisih: -250000,
        status: 'Selisih',
        statusAudit: 'Perlu Investigasi',
        keterangan: 'Potongan susut timbangan & retur sortiran grade B sebanyak 25 kg oleh pengepul saat bongkar muat.',
        notaUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        petugas: 'Siti Rahma'
      },
      {
        id: 'PNN-2026-0003',
        faktur: 'FKT-MG-2026-100',
        tanggal: '2026-08-22 16:45 WIB',
        blokKebun: 'Blok Karang Anyar',
        grade: 'Grade Super Export AA',
        pengepul: 'PT Agro Manggis Priangan',
        pengepulId: 'V-0512',
        beratKg: 1540,
        hargaKg: 15500,
        totalJual: 23870000,
        disetor: 0,
        selisih: -23870000,
        status: 'Tertunda',
        statusAudit: 'Menunggu',
        keterangan: 'Termin pembayaran transfer bank tempo H+3 setelah kontainer ekspor lolos lab karantina.',
        notaUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        petugas: 'Siti Rahma'
      },
      {
        id: 'PNN-2026-0004',
        faktur: 'FKT-MG-2026-099',
        tanggal: '2026-08-21 09:20 WIB',
        blokKebun: 'Blok Cikadu Hilir',
        grade: 'Grade Campur B/C',
        pengepul: 'Koperasi Tani Sindang Maju',
        pengepulId: 'V-0105',
        beratKg: 640,
        hargaKg: 9000,
        totalJual: 5760000,
        disetor: 5760000,
        selisih: 0,
        status: 'Lunas',
        statusAudit: 'Disetujui',
        keterangan: 'Setoran tunai diserahkan langsung ke bendahara',
        notaUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        petugas: 'Ahmad Pratama'
      },
      {
        id: 'PNN-2026-0005',
        faktur: 'FKT-MG-2026-098',
        tanggal: '2026-08-19 16:40 WIB',
        blokKebun: 'Blok C - Lembah Hijau',
        grade: 'Grade Super Ekspor A',
        pengepul: 'PT Indo Eksportir Buah',
        pengepulId: 'V-1042',
        beratKg: 2100,
        hargaKg: 30000,
        totalJual: 63000000,
        disetor: 63000000,
        selisih: 0,
        status: 'Lunas',
        statusAudit: 'Disetujui',
        keterangan: 'Transfer via Bank BNI Nagari Manggis Jaya klop',
        notaUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        petugas: 'Siti Rahma'
      }
    ],

    kasList: [
      {
        id: 'TRX-0982',
        tanggal: '2026-08-18 08:30 WIB',
        kategori: 'Perlengkapan',
        keterangan: 'Pembelian keranjang panen 50 pcs (Toko Pertanian Subur Jaya • PIC: Pak Budi)',
        debit: 0,
        kredit: 1750000,
        status: 'Disetujui',
        buktiNota: 'Nota_Resmi_SuburJaya.pdf',
        notaImg: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
        pengaju: 'Pak Budi (Mandor)',
        penyetuju: 'Ahmad Pratama'
      },
      {
        id: 'TRX-0981',
        tanggal: '2026-08-17 12:15 WIB',
        kategori: 'Konsumsi',
        keterangan: 'Konsumsi tim petik 3 hari panen (Warung Bu Siti: Makan siang + snack & kopi)',
        debit: 0,
        kredit: 850000,
        status: 'Disetujui',
        buktiNota: 'Kwitansi_BuSiti.jpg',
        notaImg: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
        pengaju: 'Siti Rahma',
        penyetuju: 'Ahmad Pratama'
      },
      {
        id: 'TRX-0980',
        tanggal: '2026-08-17 07:00 WIB',
        kategori: 'Transport',
        keterangan: 'BBM pickup angkut ke gudang sortir SPBU Cisalak 34.412.01 • 3 rit PP',
        debit: 0,
        kredit: 450000,
        status: 'Disetujui',
        buktiNota: 'Struk_SPBU_Cisalak.jpg',
        notaImg: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
        pengaju: 'Siti Rahma',
        penyetuju: 'Ahmad Pratama'
      },
      {
        id: 'TRX-0979',
        tanggal: '2026-08-16 17:40 WIB',
        kategori: 'Upah Petik',
        keterangan: 'Upah Petik Blok Pasir Wangi (Batch II) • Perhitungan 9 pemetik • 3.200 kg @ Rp 2.500',
        debit: 0,
        kredit: 8000000,
        status: 'Menunggu',
        buktiNota: 'Rekap_Timbang_Regu.pdf',
        notaImg: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
        pengaju: 'Siti Rahma',
        penyetuju: ''
      },
      {
        id: 'TRX-0975',
        tanggal: '2026-08-15 10:00 WIB',
        kategori: 'Penerimaan Kas',
        keterangan: 'Uang Muka Penjualan Grade Super Export Buyer PT Manggis Nusantara Indah',
        debit: 25000000,
        kredit: 0,
        status: 'Disetujui',
        buktiNota: 'Slip_Setor_Bank.pdf',
        notaImg: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
        pengaju: 'Siti Rahma',
        penyetuju: 'Ahmad Pratama'
      },
      {
        id: 'KAS-2026-0142',
        tanggal: '2026-08-18 14:15 WIB',
        kategori: 'Perlengkapan',
        keterangan: 'Pengadaan 40 Unit Keranjang Panen Plastik HDPE (Kebutuhan wadah sortir kluster Pasir Wangi jelang panen ekspor)',
        debit: 0,
        kredit: 3200000,
        status: 'Menunggu',
        buktiNota: 'Nota-Resmi_TokoBerkah_0826.pdf',
        notaImg: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
        pengaju: 'Siti Rahma (Bendahara Kas)',
        penyetuju: ''
      },
      {
        id: 'KAS-2026-0145',
        tanggal: '2026-08-19 09:30 WIB',
        kategori: 'Transport',
        keterangan: 'Sewa Pick-up & BBM Pengiriman Manggis ke Gudang Ekspor Cigombong (Pengantaran batch ke-2 sebanyak 3.500 kg)',
        debit: 0,
        kredit: 850000,
        status: 'Menunggu',
        buktiNota: 'Struk_SPBU_Kwitansi_Sewa.jpg',
        notaImg: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
        pengaju: 'Siti Rahma (Bendahara Kas)',
        penyetuju: ''
      },
      {
        id: 'KAS-2026-0148',
        tanggal: '2026-08-19 17:00 WIB',
        kategori: 'Konsumsi',
        keterangan: 'Konsumsi Makan Siang Tim Petik 9 Orang (2 Hari Lembur di Warung Bu Hj. Kokom untuk percepatan petik sebelum hujan sore)',
        debit: 0,
        kredit: 540000,
        status: 'Menunggu',
        buktiNota: 'Nota_Warung_Bu_Kokom.jpg',
        notaImg: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
        pengaju: 'Siti Rahma (Bendahara Kas)',
        penyetuju: ''
      }
    ],

    upahList: [
      { id: 'UPH-01', nama: 'Wahyu Arifin', initial: 'WA', regu: 'Regu A (Pasir Wangi)', peran: 'Mandor A', skema: 'Borongan', volume: 360, tarif: 2500, insentif: 200, total: 900000, status: 'Siap Bayar' },
      { id: 'UPH-02', nama: 'Joko Santoso', initial: 'JS', regu: 'Regu A (Pasir Wangi)', peran: 'Pemetik', skema: 'Borongan', volume: 380, tarif: 2500, insentif: 0, total: 950000, status: 'Siap Bayar' },
      { id: 'UPH-03', nama: 'Rian Nugraha', initial: 'RN', regu: 'Regu A (Pasir Wangi)', peran: 'Pemetik', skema: 'Borongan', volume: 340, tarif: 2500, insentif: 0, total: 850000, status: 'Siap Bayar' },
      { id: 'UPH-04', nama: 'Dedi Mulyadi', initial: 'DM', regu: 'Regu B (Cikadu Luhur)', peran: 'Mandor B', skema: 'Borongan', volume: 400, tarif: 2500, insentif: 0, total: 1000000, status: 'Siap Bayar' },
      { id: 'UPH-05', nama: 'Yusep Supriatna', initial: 'YS', regu: 'Regu B (Cikadu Luhur)', peran: 'Pemetik', skema: 'Borongan', volume: 350, tarif: 2500, insentif: 0, total: 875000, status: 'Siap Bayar' },
      { id: 'UPH-06', nama: 'Indra Hasan', initial: 'IH', regu: 'Regu B (Cikadu Luhur)', peran: 'Pemetik', skema: 'Borongan', volume: 330, tarif: 2500, insentif: 0, total: 825000, status: 'Siap Bayar' },
      { id: 'UPH-07', nama: 'Asep Saepulloh', initial: 'AS', regu: 'Regu A (Pasir Wangi)', peran: 'Pemetik', skema: 'Borongan', volume: 370, tarif: 2500, insentif: 0, total: 925000, status: 'Siap Bayar' },
      { id: 'UPH-08', nama: 'Hendra Gunawan', initial: 'HG', regu: 'Regu B (Cikadu Luhur)', peran: 'Pemetik', skema: 'Borongan', volume: 350, tarif: 2500, insentif: 0, total: 875000, status: 'Siap Bayar' },
      { id: 'UPH-09', nama: 'Tatang S.', initial: 'TS', regu: 'Regu A (Pasir Wangi)', peran: 'Pemetik', skema: 'Harian', volume: 1, tarif: 120000, insentif: 0, total: 120000, status: 'Siap Bayar' }
    ],

    masterTim: [
      { id: 'PTK-01', nama: 'Wahyu Arifin', initial: 'WA', regu: 'Regu A • Mandor', skema: 'Borongan', tarif: 2700, hp: '0812-9988-1102', status: 'Aktif Petik', catatan: '+Rp 200 Insentif Mandor' },
      { id: 'PTK-02', nama: 'Joko Santoso', initial: 'JS', regu: 'Regu A (Pasir Wangi)', skema: 'Borongan', tarif: 2500, hp: '0813-1423-2211', status: 'Aktif Petik', catatan: '' },
      { id: 'PTK-03', nama: 'Rian Nugraha', initial: 'RN', regu: 'Regu A (Pasir Wangi)', skema: 'Borongan', tarif: 2500, hp: '0877-6610-3342', status: 'Aktif Petik', catatan: '' },
      { id: 'PTK-04', nama: 'Dedi Mulyadi', initial: 'DM', regu: 'Regu B • Mandor', skema: 'Harian Kerja', tarif: 135000, hp: '0877-2200-0043', status: 'Aktif Petik', catatan: '+Rp 15.000 Mandor' },
      { id: 'PTK-05', nama: 'Yusep Supriatna', initial: 'YS', regu: 'Regu B (Cikadu Luhur)', skema: 'Borongan', tarif: 2500, hp: '0812-4411-9012', status: 'Aktif Petik', catatan: '' },
      { id: 'PTK-06', nama: 'Indra Hasan', initial: 'IH', regu: 'Regu B (Cikadu Luhur)', skema: 'Harian Kerja', tarif: 120000, hp: '0819-1021-7788', status: 'Aktif Petik', catatan: '' },
      { id: 'PTK-07', nama: 'Asep Saepulloh', initial: 'AS', regu: 'Regu A (Pasir Wangi)', skema: 'Borongan', tarif: 2500, hp: '0852-1090-4415', status: 'Aktif Petik', catatan: '' },
      { id: 'PTK-08', nama: 'Hendra Gunawan', initial: 'HG', regu: 'Regu B (Cikadu Luhur)', skema: 'Borongan', tarif: 2500, hp: '0818-5544-3120', status: 'Aktif Petik', catatan: '' },
      { id: 'PTK-09', nama: 'Tatang S.', initial: 'TS', regu: 'Regu A (Pasir Wangi)', skema: 'Harian Kerja', tarif: 120000, hp: '0812-7766-1590', status: 'Aktif Petik', catatan: '' }
    ],

    masterHarga: [
      { id: 'GR-A', grade: 'Grade Super Ekspor A', badge: 'A', tarif: 28000, desc: 'Kelopak utuh > 4 mahkota, bobot > 110 gr/buah' },
      { id: 'GR-B', grade: 'Grade Super Ekspor B', badge: 'B', tarif: 22000, desc: 'Kulit mulus, bobot 85 - 109 gr/buah' },
      { id: 'GR-C', grade: 'Grade Lokal / Olahan Sirup', badge: 'C', tarif: 10000, desc: 'Bintik ringan, kulit tebal, konsumsi domestik' }
    ],

    masterBlokMitra: {
      blokKebun: [
        { id: 'BLK-A', nama: 'Blok A - Pasir Wangi', luas: '4.2 Hektar', status: 'Siap Panen', mdpl: '650 mdpl' },
        { id: 'BLK-B', nama: 'Blok B - Cikadu Luhur', luas: '3.8 Hektar', status: 'Siap Panen', mdpl: '600 mdpl' },
        { id: 'BLK-C', nama: 'Blok C - Lembah Hijau', luas: '5.1 Hektar', status: 'Fase Pematangan', mdpl: '580 mdpl' }
      ],
      mitraPengepul: [
        { id: 'V-0881', nama: 'CV Manggis Buana Raya', tipe: 'Mitra Utama Ekspor', pasar: 'Guangzhou China' },
        { id: 'V-0294', nama: 'UD Berkah Tani Subur', tipe: 'Mitra Distribusi Grosir', pasar: 'Kramat Jati' },
        { id: 'V-0512', nama: 'PT Agro Manggis Priangan', tipe: 'Penyalur Pasar Induk', pasar: 'Jabodetabek' },
        { id: 'V-0105', nama: 'Koperasi Sindang Maju', tipe: 'Pengepul Olahan UMKM', pasar: 'Olahan Sirup & Teh' }
      ]
    },

    auditLog: [
      { id: 'LOG-01', waktu: 'Hari ini, 08:12 WIB', tipe: 'Disetujui', target: 'KAS-2026-0139', desc: 'Pembelian karung jaring transparan 200 pcs (Rp 420.000). Otorisasi oleh Ahmad Pratama.' },
      { id: 'LOG-02', waktu: 'Kemarin, 19:40 WIB', tipe: 'Ditolak', target: 'KAS-2026-0138', desc: 'Klaim servis motor pribadi tanpa nota bengkel resmi (Rp 250.000). Diminta lampirkan faktur pajak.' },
      { id: 'LOG-03', waktu: 'Kemarin, 14:05 WIB', tipe: 'Selesai', target: 'PNN-0024', desc: 'Penyelesaian Selisih: Pelunasan transfer sisa Rp 800.000 oleh UD Sumber Buah Berkah (Klop).' }
    ],

    dokumenList: [
      {
        id: 'DOC-8F2A99B1',
        nomor: '042/BUMDES-MJM/PANEN-VIII/2026',
        jenis: 'Rekap Panen & Laba Bersih',
        periode: '01 Agustus 2026 - 31 Agustus 2026',
        status: 'TERBIT',
        kodeVerifikasi: 'MJK-8F2A-99B1-E37C',
        hashSha256: 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855',
        terbit: '2026-08-31 17:42 WIB',
        kades: 'H. Suryana, S.Sos',
        koordinator: 'Ahmad Pratama',
        bendahara: 'Siti Rahma'
      }
    ]
  };

  let state = loadFromStorage();

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState;
      const parsed = JSON.parse(raw);
      return {
        ...defaultState,
        ...parsed,
        masterBlokMitra: parsed.masterBlokMitra || defaultState.masterBlokMitra
      };
    } catch (e) {
      console.warn('Gagal memuat dari storage, memakai defaultState', e);
      return defaultState;
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      notify();
    } catch (e) {
      console.error('Gagal menyimpan ke LocalStorage', e);
    }
  }

  function notify() {
    _subscribers.forEach(cb => {
      try { cb(state); } catch (err) { console.error('Error on store subscriber', err); }
    });
  }

  // =========================================================================
  // KALKULASI FINANSIAL REAL-TIME (Sesuai PRD & Screenshot)
  // =========================================================================
  function getCalculatedMetrics() {
    // 1. Akumulasi Panen & Penjualan
    let volumeTotalKg = 0;
    let brutoPenjualan = 0;
    let nominalDisetor = 0;
    let totalSelisih = 0;

    state.panenList.forEach(p => {
      volumeTotalKg += Number(p.beratKg || 0);
      brutoPenjualan += Number(p.totalJual || 0);
      nominalDisetor += Number(p.disetor || 0);
      totalSelisih += Number(p.selisih || 0);
    });

    // 2. Akumulasi Kas Operasional
    let totalPengeluaranOps = 0;
    let totalPemasukanKas = nominalDisetor; // Pemasukan kas dari hasil penjualan
    let totalUpahPetik = 0;
    let countMenungguAudit = 0;

    state.kasList.forEach(k => {
      if (k.status === 'Menunggu') countMenungguAudit++;
      if (k.status !== 'Ditolak') {
        const kredit = Number(k.kredit || 0);
        const debit = Number(k.debit || 0);
        totalPengeluaranOps += kredit;
        totalPemasukanKas += debit;
        if (k.kategori === 'Upah Petik' || String(k.keterangan).toLowerCase().includes('upah')) {
          totalUpahPetik += kredit;
        }
      }
    });

    // 3. Saldo Kas & Efisiensi
    const saldoKasAktif = totalPemasukanKas - totalPengeluaranOps;
    const labaBersih = brutoPenjualan - totalPengeluaranOps;
    const efisiensiBiayaPetik = volumeTotalKg > 0 ? Math.round(totalUpahPetik / volumeTotalKg) : 2450;
    const rataHargaJual = volumeTotalKg > 0 ? Math.round(brutoPenjualan / volumeTotalKg) : 0;
    const rasioSlaDesa = brutoPenjualan > 0 ? ((totalPengeluaranOps / brutoPenjualan) * 100).toFixed(1) : '23.7';

    return {
      volumeTotalKg,
      brutoPenjualan,
      nominalDisetor,
      totalSelisih,
      totalPengeluaranOps,
      totalPemasukanKas,
      totalUpahPetik,
      saldoKasAktif,
      labaBersih,
      efisiensiBiayaPetik,
      rataHargaJual,
      rasioSlaDesa,
      countMenungguAudit,
      isKasKlop: totalSelisih === 0,
      targetMusimKg: 20000,
      persenTargetPanen: Math.round((volumeTotalKg / 20000) * 100)
    };
  }

  return {
    subscribe: function (cb) {
      _subscribers.push(cb);
      return function unsubscribe() {
        const idx = _subscribers.indexOf(cb);
        if (idx !== -1) _subscribers.splice(idx, 1);
      };
    },

    getState: function () {
      return state;
    },

    getCalculatedMetrics,

    getPanenList: () => state.panenList,
    getKasList: () => state.kasList,
    getUpahList: () => state.upahList,
    getMasterTim: () => state.masterTim,
    getMasterHarga: () => state.masterHarga,
    getMasterBlokMitra: () => state.masterBlokMitra,
    getDokumenList: () => state.dokumenList,
    getAuditLog: () => state.auditLog,

    // =========================================================================
    // AKSI MUTASI STATE (Optimistic Updates)
    // =========================================================================
    addPenjualan: function (payload) {
      const nextNum = state.panenList.length + 1;
      const id = 'PNN-' + new Date().getFullYear() + '-' + String(nextNum).padStart(4, '0');
      const faktur = 'FKT-MG-' + new Date().getFullYear() + '-' + String(100 + nextNum);

      const berat = Number(payload.beratBersih || 0);
      const harga = Number(payload.hargaSatuan || 0);
      const totalJual = berat * harga;
      const disetor = Number(payload.nominalDisetor || 0);
      const selisih = disetor - totalJual;

      let status = 'Lunas';
      let statusAudit = 'Disetujui';
      if (disetor === 0) {
        status = 'Tertunda';
        statusAudit = 'Menunggu';
      } else if (selisih < 0) {
        status = 'Selisih';
        statusAudit = 'Perlu Investigasi';
      }

      const item = {
        id: id,
        faktur: faktur,
        tanggal: payload.tanggal || new Date().toISOString().slice(0, 10),
        blokKebun: payload.blokKebun || 'Blok A - Pasir Wangi',
        grade: payload.grade || 'Grade Super Ekspor A',
        pengepul: payload.namaPengepul || 'CV Manggis Buana Raya',
        pengepulId: payload.pengepulId || 'V-0881',
        beratKg: berat,
        hargaKg: harga,
        totalJual: totalJual,
        disetor: disetor,
        selisih: selisih,
        status: status,
        statusAudit: statusAudit,
        keterangan: payload.keterangan || (selisih < 0 ? 'Terdapat selisih setoran yang menunggu verifikasi' : 'Setoran lunas klop'),
        notaUrl: payload.notaUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        petugas: Store.getCurrentUser()?.nama || 'Petugas Lapangan'
      };

      state.panenList.unshift(item);
      saveToStorage();
      return item;
    },

    addKasOperasional: function (payload) {
      const nextNum = state.kasList.length + 1;
      const id = 'KAS-' + new Date().getFullYear() + '-' + String(nextNum).padStart(4, '0');
      const debit = Number(payload.debit || 0);
      const kredit = Number(payload.kredit || 0);

      const currentUser = Store.getCurrentUser();
      // RBAC: Bendahara tidak dapat menyetujui pengeluarannya sendiri
      const isKoordinator = currentUser?.role === 'Koordinator';
      const status = isKoordinator ? 'Disetujui' : 'Menunggu';

      const item = {
        id: id,
        tanggal: payload.tanggal || new Date().toISOString().slice(0, 10),
        kategori: payload.kategori || 'Perlengkapan',
        keterangan: payload.keterangan || '',
        debit: debit,
        kredit: kredit,
        status: status,
        buktiNota: payload.buktiNota || 'Nota_Transaksi.jpg',
        notaImg: payload.notaImg || 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
        pengaju: currentUser?.nama || 'Siti Rahma (Bendahara Kas)',
        penyetuju: isKoordinator ? currentUser.nama : ''
      };

      state.kasList.unshift(item);
      saveToStorage();
      return item;
    },

    addRekapUpah: function (payload) {
      const items = payload.anggotaList || [];
      const tanggal = payload.tanggal || new Date().toISOString().slice(0, 10);
      let totalSemua = 0;

      items.forEach((m, idx) => {
        const upah = Number(m.total || (Number(m.volume) * Number(m.tarif)));
        totalSemua += upah;
        const upahRecord = {
          id: 'UPH-' + String(state.upahList.length + idx + 1).padStart(2, '0'),
          nama: m.nama,
          initial: m.nama.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
          regu: m.regu || 'Regu A (Pasir Wangi)',
          peran: m.peran || 'Pemetik',
          skema: m.skema || 'Borongan',
          volume: Number(m.volume || 0),
          tarif: Number(m.tarif || 0),
          insentif: Number(m.insentif || 0),
          total: upah,
          status: 'Siap Bayar'
        };
        // Update jika ada, atau tambahkan
        const existingIdx = state.upahList.findIndex(u => u.nama === m.nama);
        if (existingIdx !== -1) {
          state.upahList[existingIdx] = upahRecord;
        } else {
          state.upahList.push(upahRecord);
        }
      });

      // Otomatis buat pengeluaran di kas operasional sesuai PRD F3
      const kasId = 'KAS-' + new Date().getFullYear() + '-' + String(state.kasList.length + 1).padStart(4, '0');
      state.kasList.unshift({
        id: kasId,
        tanggal: tanggal,
        kategori: 'Upah Petik',
        keterangan: `Upah Tim Petik (${items.length} Anggota) • Periode Panen Pekan Ini`,
        debit: 0,
        kredit: totalSemua,
        status: 'Menunggu',
        buktiNota: 'Rekap_Perhitungan_Upah.pdf',
        notaImg: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
        pengaju: Store.getCurrentUser()?.nama || 'Siti Rahma',
        penyetuju: ''
      });

      saveToStorage();
      return { totalUpah: totalSemua, kasId: kasId };
    },

    prosesApproval: function (payload) {
      const { idTarget, tipe, keputusan, catatan } = payload;
      const auditor = Store.getCurrentUser()?.nama || 'Ahmad Pratama';

      if (tipe === 'KAS') {
        const item = state.kasList.find(k => k.id === idTarget);
        if (item) {
          item.status = keputusan;
          item.penyetuju = keputusan === 'Disetujui' ? auditor : '';
          item.catatan = catatan || '';
          
          state.auditLog.unshift({
            id: 'LOG-' + Date.now().toString().slice(-4),
            waktu: 'Baru saja',
            tipe: keputusan,
            target: idTarget,
            desc: `${item.keterangan.slice(0, 45)}... • Otorisasi oleh ${auditor}.`
          });
        }
      } else if (tipe === 'PENJUALAN') {
        const item = state.panenList.find(p => p.id === idTarget);
        if (item) {
          item.statusAudit = keputusan === 'Disetujui' ? 'Selesai' : 'Ditolak';
          if (catatan) item.keterangan = catatan;

          state.auditLog.unshift({
            id: 'LOG-' + Date.now().toString().slice(-4),
            waktu: 'Baru saja',
            tipe: 'Selesai',
            target: idTarget,
            desc: `Penyelesaian Selisih Setoran: ${item.pengepul} (${item.faktur}) • ${auditor}.`
          });
        }
      }

      saveToStorage();
      return { idTarget, keputusan };
    },

    // Session Management
    setCurrentUser: function (user, token) {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        if (token) localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
      notify();
    },

    getCurrentUser: function () {
      try {
        const u = localStorage.getItem(USER_KEY);
        return u ? JSON.parse(u) : null;
      } catch (e) {
        return null;
      }
    },

    getToken: function () {
      return localStorage.getItem(TOKEN_KEY) || '';
    },

    resetToDefault: function () {
      state = JSON.parse(JSON.stringify(defaultState));
      saveToStorage();
    }
  };
})();
