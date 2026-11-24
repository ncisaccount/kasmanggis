/**
 * =========================================================================
 * ManggisKas Desa - Main Controller & View Router (app.js)
 * Sesuai Standar Skill: gas-pro-api, gas-scale-turbo, gas-doc-engine
 * 
 * Fitur:
 * - Single Page Application Router (0ms instant tab switching).
 * - Reactive Data Binding ke Store.
 * - Penanganan Interaktif Form Input Panen, Kas, Upah, dan Audit.
 * - RBAC Switcher (Bendahara vs Koordinator vs Publik).
 * - Pengelola Modal, Toast, Ekspor Excel/CSV, dan Cetak Dokumen PDF.
 * =========================================================================
 */

const App = (function () {
  let currentView = 'dashboard';
  let activeAuditTab = 'tab-1';
  let activeMasterTab = 'tab-pemetik';
  let upahSkemaActive = 'borongan'; // 'borongan' or 'harian'

  // =========================================================================
  // 1. ROUTER & NAVIGASI SINGLE PAGE APPLICATION (SPA)
  // =========================================================================
  function initRouter() {
    window.addEventListener('hashchange', handleHashChange);
    // Bind semua tautan data-path
    document.addEventListener('click', function (e) {
      const target = e.target.closest('[data-path]');
      if (target) {
        e.preventDefault();
        const path = target.getAttribute('data-path');
        navigateTo(path);
      }
    });

    // Initial route
    handleHashChange();
  }

  function handleHashChange() {
    let hash = window.location.hash.replace(/^#\/?/, '');
    if (!hash) hash = 'dashboard';

    // Route alias
    if (hash === 'penjualan') hash = 'input-panen';
    if (hash === 'dashboard-publik') hash = 'dashboard';

    // Verifikasi parameter jika ada
    if (hash.startsWith('verifikasi')) {
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      const kode = urlParams.get('kode');
      if (kode) {
        showVerificationModal(kode);
      }
      hash = 'laporan';
    }

    navigateTo(hash, false);
  }

  function navigateTo(viewName, updateHash = true) {
    if (viewName === 'keluar') {
      handleLogout();
      return;
    }

    currentView = viewName;
    if (updateHash) {
      window.location.hash = '#/' + viewName;
    }

    // Update active state di semua view-panel
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const targetPanel = document.getElementById('view-' + viewName);
    if (targetPanel) {
      targetPanel.classList.add('active');
    } else {
      console.warn('View panel not found:', viewName);
      const dash = document.getElementById('view-dashboard');
      if (dash) dash.classList.add('active');
    }

    // Update styling sidebar dan topnav
    updateActiveNavClasses(viewName);

    // Render ulang data pada view yang sedang dibuka
    renderCurrentView(viewName);

    // Scroll ke atas dengan halus
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function updateActiveNavClasses(viewName) {
    // Sidebar
    document.querySelectorAll('aside nav a[data-path]').forEach(link => {
      const path = link.getAttribute('data-path');
      if (path === viewName || (path === 'penjualan' && viewName === 'input-panen')) {
        link.className = 'w-11 h-11 rounded-xl flex items-center justify-center transition-all bg-primary-container text-on-primary font-bold shadow-sm';
      } else {
        link.className = 'w-11 h-11 rounded-xl flex items-center justify-center text-text-muted hover:bg-surface-subtle hover:text-primary transition-all';
      }
    });

    // Top Header Nav
    document.querySelectorAll('header nav a[data-path]').forEach(link => {
      const path = link.getAttribute('data-path');
      if (path === viewName || (path === 'penjualan' && viewName === 'input-panen')) {
        link.className = 'px-space-md py-1.5 rounded-full transition-colors bg-primary-container text-on-primary font-bold shadow-sm text-sm';
      } else {
        link.className = 'px-space-md py-1.5 rounded-full font-label-md text-label-md text-text-secondary hover:text-text-primary transition-colors text-sm';
      }
    });

    // Khusus Tampilan Login: Sembunyikan Sidebar & Header
    const aside = document.querySelector('aside');
    const header = document.querySelector('header');
    const mainWrap = document.querySelector('.pl-\\[84px\\]');

    if (viewName === 'login') {
      if (aside) aside.style.display = 'none';
      if (header) header.style.display = 'none';
      if (mainWrap) mainWrap.style.paddingLeft = '0px';
    } else {
      if (aside) aside.style.display = 'flex';
      if (header) header.style.display = 'flex';
      if (mainWrap) mainWrap.style.paddingLeft = '84px';
    }
  }

  // =========================================================================
  // 2. RENDER SETIAP SCREEN SESUAI DATA STATE TERBARU
  // =========================================================================
  function renderCurrentView(viewName) {
    updateUserBadge();
    const metrics = Store.getCalculatedMetrics();

    switch (viewName) {
      case 'dashboard':
        renderDashboard(metrics);
        break;
      case 'input-panen':
        renderInputPanen();
        break;
      case 'kas-operasional':
        renderKasOperasional(metrics);
        break;
      case 'upah-tim':
        renderUpahTim();
        break;
      case 'audit-approval':
        renderAuditApproval();
        break;
      case 'laporan':
        renderLaporan(metrics);
        break;
      case 'master-data':
        renderMasterData();
        break;
      case 'login':
        // No specific data render needed
        break;
    }
  }

  function updateUserBadge() {
    const user = Store.getCurrentUser();
    const userDisplay = document.getElementById('header-user-display');
    const userRole = document.getElementById('header-user-role');
    const userImg = document.getElementById('header-user-img');

    if (userDisplay && userRole) {
      if (user) {
        userDisplay.textContent = user.nama || user.username;
        userRole.textContent = user.role === 'Koordinator' ? 'Koordinator Lapangan' : 'Bendahara Kas';
        if (userImg) userImg.style.display = 'block';
      } else {
        userDisplay.textContent = 'Masyarakat / Publik';
        userRole.textContent = 'Akses Terbuka Desa';
      }
    }
  }

  // =========================================================================
  // 3. RENDER DASHBOARD (SCREEN 2)
  // =========================================================================
  function renderDashboard(metrics) {
    // 1. Saldo Kas Aktif BUMDes
    const elSaldo = document.getElementById('dash-saldo-kas');
    if (elSaldo) elSaldo.textContent = DocEngine.formatRupiah(metrics.saldoKasAktif);

    // 2. Pendapatan Panen
    const elPendapatan = document.getElementById('dash-pendapatan');
    if (elPendapatan) elPendapatan.textContent = '+' + DocEngine.formatRupiah(metrics.brutoPenjualan);

    // 3. Volume Panen
    const elVolume = document.getElementById('dash-volume-kg');
    if (elVolume) elVolume.textContent = DocEngine.formatRibuan(metrics.volumeTotalKg) + ' kg';

    // 4. Efisiensi Biaya Petik
    const elEfisiensi = document.getElementById('dash-efisiensi-upah');
    if (elEfisiensi) elEfisiensi.textContent = DocEngine.formatRupiah(metrics.efisiensiBiayaPetik) + ' / kg';

    // 5. Tabel Riwayat Penjualan & Setoran Terbaru
    const tbody = document.getElementById('dash-tbody-penjualan');
    if (tbody) {
      const list = Store.getPanenList();
      tbody.innerHTML = list.slice(0, 6).map((item, idx) => {
        let statusBadge = '';
        if (item.status === 'Lunas') {
          statusBadge = '<span class="inline-flex items-center gap-1 font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-status-lunas-bg text-status-lunas-fg font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-status-lunas-fg"></span>Lunas</span>';
        } else if (item.status === 'Selisih') {
          statusBadge = '<span class="inline-flex items-center gap-1 font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-status-selisih-bg text-status-selisih-fg font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-status-selisih-fg"></span>Selisih Susut</span>';
        } else {
          statusBadge = '<span class="inline-flex items-center gap-1 font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-status-tertunda-bg text-status-tertunda-fg font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-status-tertunda-fg"></span>Tertunda</span>';
        }

        const selisihFormatted = item.selisih < 0 
          ? `<span class="text-status-selisih-fg font-semibold font-mono">-${DocEngine.formatRupiah(Math.abs(item.selisih))}</span>`
          : `<span class="text-text-muted font-mono">Rp 0</span>`;

        return `
          <tr class="hover:bg-surface-subtle/60 transition-colors border-b border-border-subtle/50">
            <td class="py-3.5 px-3">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs text-text-muted bg-surface-subtle px-1.5 py-0.5 rounded">#0${idx + 1}</span>
                <div>
                  <p class="font-headline-sm text-headline-sm text-text-primary text-xs font-semibold">${item.blokKebun}</p>
                  <p class="font-body-sm text-body-sm text-text-muted text-[11px]">${item.grade}</p>
                </div>
              </div>
            </td>
            <td class="py-3.5 px-3">
              <p class="font-body-md text-body-md text-text-primary text-xs font-medium">${item.pengepul}</p>
              <p class="font-body-sm text-body-sm text-text-muted text-[11px]">${item.tanggal}</p>
            </td>
            <td class="py-3.5 px-3 text-right font-mono font-medium text-xs">${DocEngine.formatRibuan(item.beratKg)} kg</td>
            <td class="py-3.5 px-3 text-right font-mono font-bold text-xs">${DocEngine.formatRupiah(item.totalJual)}</td>
            <td class="py-3.5 px-3 text-right font-mono text-xs">${DocEngine.formatRupiah(item.disetor)}</td>
            <td class="py-3.5 px-3 text-right text-xs">${selisihFormatted}</td>
            <td class="py-3.5 px-3 text-center">${statusBadge}</td>
            <td class="py-3.5 px-3 text-right">
              <button onclick="App.showNotaModal('${item.faktur}', '${item.notaUrl || ''}', '${item.keterangan || ''}')" class="text-primary hover:text-secondary font-label-sm text-label-sm underline font-semibold text-xs" type="button">
                Lihat Nota
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // =========================================================================
  // 4. RENDER INPUT PANEN & REKONSILIASI (SCREEN 3)
  // =========================================================================
  function renderInputPanen() {
    // Isi otomatis tanggal hari ini jika kosong
    const tglInput = document.getElementById('input-panen-tanggal');
    if (tglInput && !tglInput.value) {
      tglInput.value = new Date().toISOString().slice(0, 10);
    }

    recalcInputPanenLive();
    renderRecentPanenList();
  }

  function recalcInputPanenLive() {
    const elBerat = document.getElementById('input-panen-berat');
    const elHarga = document.getElementById('input-panen-harga');
    const elSetor = document.getElementById('input-panen-setor');

    const berat = Number(elBerat?.value || 0);
    const harga = Number(elHarga?.value || 0);
    const totalJual = berat * harga;
    const disetor = Number(elSetor?.value || 0);
    const selisih = disetor - totalJual;

    // Highlight Box Total Nilai Jual
    const elTotalDisplay = document.getElementById('input-panen-total-display');
    if (elTotalDisplay) {
      elTotalDisplay.textContent = DocEngine.formatRupiah(totalJual);
    }

    // Live Reconciliation Card
    const cardStatusBox = document.getElementById('recon-status-box');
    const elReconTotal = document.getElementById('recon-total-jual');
    const elReconSetor = document.getElementById('recon-disetor');
    const elReconSelisih = document.getElementById('recon-selisih');
    const elAlasanContainer = document.getElementById('recon-alasan-container');

    if (elReconTotal) elReconTotal.textContent = DocEngine.formatRupiah(totalJual);
    if (elReconSetor) elReconSetor.textContent = DocEngine.formatRupiah(disetor);
    
    if (elReconSelisih) {
      if (selisih < 0) {
        elReconSelisih.textContent = '-' + DocEngine.formatRupiah(Math.abs(selisih));
        elReconSelisih.className = 'font-stat-display text-stat-display text-status-selisih-fg mt-0.5';
      } else {
        elReconSelisih.textContent = DocEngine.formatRupiah(selisih);
        elReconSelisih.className = 'font-stat-display text-stat-display text-status-lunas-fg mt-0.5';
      }
    }

    if (cardStatusBox) {
      if (selisih < 0) {
        cardStatusBox.className = 'p-space-md rounded-xl bg-status-selisih-bg text-status-selisih-fg flex flex-col gap-1 border border-status-selisih-fg/20';
        cardStatusBox.innerHTML = `
          <div class="flex items-center gap-2 font-bold font-headline-sm text-sm">
            <span class="material-symbols-outlined text-[20px]">warning</span>
            <span>Status: SELISIH (Perlu Investigasi)</span>
          </div>
          <p class="text-xs opacity-90 leading-tight">Uang tunai yang disetor ke bendahara lebih rendah dari total nilai faktur timbang pengepul.</p>
        `;
        if (elAlasanContainer) elAlasanContainer.style.display = 'block';
      } else {
        cardStatusBox.className = 'p-space-md rounded-xl bg-status-lunas-bg text-status-lunas-fg flex flex-col gap-1 border border-status-lunas-fg/20';
        cardStatusBox.innerHTML = `
          <div class="flex items-center gap-2 font-bold font-headline-sm text-sm">
            <span class="material-symbols-outlined text-[20px]">check_circle</span>
            <span>Status: LUNAS PAS (Klop & Sesuai)</span>
          </div>
          <p class="text-xs opacity-90 leading-tight">Nominal fisik setoran yang diserahkan ke kasir klop dengan kalkulasi timbangan.</p>
        `;
        if (elAlasanContainer) elAlasanContainer.style.display = 'none';
      }
    }
  }

  function renderRecentPanenList() {
    const list = Store.getPanenList();
    const container = document.getElementById('recent-panen-tbody');
    if (!container) return;

    container.innerHTML = list.slice(0, 3).map(item => `
      <tr class="hover:bg-surface-subtle/50 transition-colors border-b border-border-subtle/40">
        <td class="py-3 px-3">
          <p class="font-bold text-xs text-text-primary font-mono">${item.faktur}</p>
          <p class="text-[11px] text-text-muted">${item.tanggal}</p>
        </td>
        <td class="py-3 px-3">
          <p class="text-xs font-semibold text-text-primary">${item.blokKebun}</p>
          <p class="text-[11px] text-text-muted">${item.pengepul}</p>
        </td>
        <td class="py-3 px-3 text-right font-mono text-xs">${DocEngine.formatRibuan(item.beratKg)} kg</td>
        <td class="py-3 px-3 text-right font-mono text-xs">${DocEngine.formatRupiah(item.totalJual)}</td>
        <td class="py-3 px-3 text-right font-mono text-xs font-bold text-status-lunas-fg">${DocEngine.formatRupiah(item.disetor)}</td>
        <td class="py-3 px-3 text-center">
          <span class="inline-flex items-center gap-1 font-label-sm text-[11px] px-2 py-0.5 rounded-full ${item.status === 'Lunas' ? 'bg-status-lunas-bg text-status-lunas-fg' : 'bg-status-selisih-bg text-status-selisih-fg'} font-medium">
            <span class="w-1.5 h-1.5 rounded-full ${item.status === 'Lunas' ? 'bg-status-lunas-fg' : 'bg-status-selisih-fg'}"></span>
            ${item.status}
          </span>
        </td>
        <td class="py-3 px-3 text-right">
          <button onclick="App.showNotaModal('${item.faktur}', '${item.notaUrl}', '${item.keterangan}')" class="text-primary hover:underline text-xs font-semibold">
            Detail
          </button>
        </td>
      </tr>
    `).join('');
  }

  // =========================================================================
  // 5. RENDER KAS OPERASIONAL & UPAH TIM (SCREEN 1)
  // =========================================================================
  function renderKasOperasional(metrics) {
    const elPemasukan = document.getElementById('kas-total-pemasukan');
    const elPengeluaran = document.getElementById('kas-total-pengeluaran');
    const elSaldo = document.getElementById('kas-saldo-bersih');

    if (elPemasukan) elPemasukan.textContent = DocEngine.formatRupiah(metrics.totalPemasukanKas);
    if (elPengeluaran) elPengeluaran.textContent = DocEngine.formatRupiah(metrics.totalPengeluaranOps);
    if (elSaldo) elSaldo.textContent = DocEngine.formatRupiah(metrics.saldoKasAktif);

    // Render Jurnal Kas
    const tbody = document.getElementById('kas-jurnal-tbody');
    if (tbody) {
      const kasList = Store.getKasList();
      tbody.innerHTML = kasList.map(item => {
        let catColor = 'bg-surface-subtle text-text-secondary';
        if (item.kategori === 'Upah Petik') catColor = 'bg-status-disetujui-bg text-status-disetujui-fg';
        if (item.kategori === 'Konsumsi') catColor = 'bg-status-tertunda-bg text-status-tertunda-fg';
        if (item.kategori === 'Transport') catColor = 'bg-status-lunas-bg text-status-lunas-fg';
        if (item.kategori === 'Perlengkapan') catColor = 'bg-surface-container-high text-primary';

        const nominalFormatted = item.kredit > 0
          ? `<span class="text-status-ditolak-fg font-bold font-mono">- ${DocEngine.formatRupiah(item.kredit)}</span>`
          : `<span class="text-status-lunas-fg font-bold font-mono">+ ${DocEngine.formatRupiah(item.debit)}</span>`;

        return `
          <tr class="hover:bg-surface-subtle/50 transition-colors border-b border-border-subtle/40">
            <td class="py-3.5 px-3">
              <p class="font-mono font-bold text-xs text-text-primary">${item.id}</p>
              <p class="text-[11px] text-text-muted">${item.tanggal}</p>
            </td>
            <td class="py-3.5 px-3">
              <span class="inline-flex items-center gap-1 font-label-sm text-[11px] px-2.5 py-0.5 rounded-full ${catColor} font-semibold">
                ${item.kategori}
              </span>
            </td>
            <td class="py-3.5 px-3 max-w-[280px]">
              <p class="text-xs text-text-primary font-medium leading-snug">${item.keterangan}</p>
              <p class="text-[11px] text-text-muted mt-0.5">PIC: ${item.pengaju}</p>
            </td>
            <td class="py-3.5 px-3 text-right text-xs">
              ${nominalFormatted}
            </td>
            <td class="py-3.5 px-3 text-center">
              <span class="inline-flex items-center gap-1 font-label-sm text-[11px] px-2 py-0.5 rounded-full ${item.status === 'Disetujui' ? 'bg-status-lunas-bg text-status-lunas-fg' : (item.status === 'Menunggu' ? 'bg-status-menunggu-bg text-status-menunggu-fg' : 'bg-status-ditolak-bg text-status-ditolak-fg')} font-medium">
                <span class="w-1.5 h-1.5 rounded-full ${item.status === 'Disetujui' ? 'bg-status-lunas-fg' : 'bg-status-menunggu-fg'}"></span>
                ${item.status}
              </span>
            </td>
            <td class="py-3.5 px-3 text-right">
              <button onclick="App.showNotaModal('${item.id}', '${item.notaImg || ''}', '${item.keterangan}')" class="text-primary hover:underline text-xs font-semibold flex items-center gap-1 ml-auto">
                <span class="material-symbols-outlined text-[16px]">receipt</span>
                <span>Nota</span>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Render Side Wage Roll
    renderSideUpahList();
  }

  function renderSideUpahList() {
    const container = document.getElementById('kas-upah-roll');
    if (!container) return;

    const upahList = Store.getUpahList();
    let totalAll = 0;

    container.innerHTML = upahList.map(u => {
      totalAll += u.total;
      return `
        <div class="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-subtle transition-colors">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
              ${u.initial}
            </div>
            <div>
              <p class="text-xs font-bold text-text-primary">${u.nama}</p>
              <p class="text-[11px] text-text-muted font-mono">${u.volume} kg • @ Rp ${DocEngine.formatRibuan(u.tarif)}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-xs font-bold text-primary font-mono">${DocEngine.formatRupiah(u.total)}</p>
            <span class="text-[10px] text-status-lunas-fg font-semibold bg-status-lunas-bg px-1.5 py-0.2 rounded">Siap Bayar</span>
          </div>
        </div>
      `;
    }).join('');

    const elTotalKalkulasi = document.getElementById('kas-upah-total-kalkulasi');
    if (elTotalKalkulasi) elTotalKalkulasi.textContent = DocEngine.formatRupiah(totalAll);
  }

  // =========================================================================
  // 6. RENDER UPAH TIM GENERATOR
  // =========================================================================
  function renderUpahTim() {
    renderSideUpahList();
  }

  // =========================================================================
  // 7. RENDER AUDIT & APPROVAL KOORDINATOR (SCREEN 7)
  // =========================================================================
  function renderAuditApproval() {
    const user = Store.getCurrentUser();
    const isKoordinator = user?.role === 'Koordinator';

    const countPendingKas = Store.getKasList().filter(k => k.status === 'Menunggu').length;
    const countPendingPanen = Store.getPanenList().filter(p => p.status === 'Selisih' || p.statusAudit === 'Perlu Investigasi').length;

    const bKas = document.getElementById('audit-count-badge-kas');
    const bPanen = document.getElementById('audit-count-badge-panen');
    if (bKas) bKas.textContent = `${countPendingKas} Transaksi`;
    if (bPanen) bPanen.textContent = `${countPendingPanen} Kasus`;

    // Render Stream Tab 1: Pengeluaran Kas
    const containerKas = document.getElementById('audit-stream-kas');
    if (containerKas) {
      const pendingKas = Store.getKasList().filter(k => k.status === 'Menunggu');
      if (pendingKas.length === 0) {
        containerKas.innerHTML = `
          <div class="p-8 rounded-2xl bg-surface-white text-center flex flex-col items-center justify-center gap-2 shadow-sm">
            <span class="material-symbols-outlined text-[48px] text-chart-mint-stroke">check_circle</span>
            <p class="font-headline-sm text-headline-sm text-primary">Semua Pengeluaran Telah Diaudit</p>
            <p class="font-body-sm text-body-sm text-text-muted">Tidak ada pengajuan kas operasional yang tertunda otorisasi saat ini.</p>
          </div>
        `;
      } else {
        containerKas.innerHTML = pendingKas.map(k => `
          <div class="bg-surface-white rounded-2xl p-space-lg shadow-sm border border-border-subtle/60 flex flex-col gap-space-md">
            <div class="flex flex-col md:flex-row md:items-start justify-between gap-space-md">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <span class="font-mono font-bold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">${k.id}</span>
                  <span class="text-text-muted">•</span>
                  <span class="text-xs text-text-muted">${k.tanggal}</span>
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-subtle text-text-secondary">${k.kategori}</span>
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-status-menunggu-bg text-status-menunggu-fg">Menunggu Otorisasi</span>
                </div>
                <h3 class="font-headline-sm text-headline-sm text-text-primary mt-1 font-bold">${k.keterangan}</h3>
                <div class="flex items-center gap-2 mt-2 text-xs text-text-muted">
                  <div class="w-5 h-5 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-[10px]">SR</div>
                  <span>Diajukan oleh: <strong class="text-text-primary">${k.pengaju}</strong></span>
                </div>
              </div>
              <div class="text-left md:text-right bg-surface-subtle md:bg-transparent p-3 md:p-0 rounded-xl">
                <span class="text-[11px] text-text-muted uppercase font-bold tracking-wider">Nominal Pengajuan</span>
                <p class="font-stat-display text-stat-display text-primary font-bold">${DocEngine.formatRupiah(k.kredit)}</p>
              </div>
            </div>

            <!-- Receipt & Evidence Snippet -->
            <div class="bg-surface-subtle/80 p-3 rounded-xl flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <img src="${k.notaImg || 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80'}" class="w-12 h-12 rounded-lg object-cover shadow-sm cursor-pointer" onclick="App.showNotaModal('${k.id}', '${k.notaImg || ''}', '${k.keterangan}')" alt="Nota Fisik"/>
                <div>
                  <p class="text-xs font-bold text-text-primary">${k.buktiNota || 'Nota_Bukti_Fisik.jpg'}</p>
                  <p class="text-[11px] text-text-muted">Lampiran terverifikasi stempel basah toko</p>
                </div>
              </div>
              <button onclick="App.showNotaModal('${k.id}', '${k.notaImg || ''}', '${k.keterangan}')" class="px-3 py-1.5 rounded-lg bg-surface-white text-xs font-semibold text-text-secondary hover:text-primary transition-colors shadow-sm">
                Pratinjau Bukti
              </button>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center justify-end gap-2 pt-1 border-t border-border-subtle/60">
              ${isKoordinator ? `
                <button onclick="App.handleActionApproval('${k.id}', 'KAS', 'Ditolak')" class="px-4 py-2 rounded-xl text-xs font-bold text-status-ditolak-fg hover:bg-status-ditolak-bg transition-colors flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[16px]">cancel</span>
                  <span>Tolak & Minta Revisi</span>
                </button>
                <button onclick="App.handleActionApproval('${k.id}', 'KAS', 'Disetujui')" class="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-on-primary hover:bg-primary-container transition-all shadow-sm flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Setujui Pengeluaran</span>
                </button>
              ` : `
                <span class="text-xs text-text-muted italic">Login sebagai Koordinator untuk menyetujui transaksi ini.</span>
              `}
            </div>
          </div>
        `).join('');
      }
    }

    // Render Stream Tab 2: Audit Selisih Penjualan
    const containerPanen = document.getElementById('audit-stream-panen');
    if (containerPanen) {
      const selisihList = Store.getPanenList().filter(p => p.status === 'Selisih' || p.statusAudit === 'Perlu Investigasi');
      if (selisihList.length === 0) {
        containerPanen.innerHTML = `
          <div class="p-8 rounded-2xl bg-surface-white text-center flex flex-col items-center justify-center gap-2 shadow-sm">
            <span class="material-symbols-outlined text-[48px] text-chart-mint-stroke">task_alt</span>
            <p class="font-headline-sm text-headline-sm text-primary">Seluruh Setoran Penjualan Klop</p>
            <p class="font-body-sm text-body-sm text-text-muted">Tidak ada selisih timbangan atau kekurangan setoran yang aktif.</p>
          </div>
        `;
      } else {
        containerPanen.innerHTML = selisihList.map(p => `
          <div class="bg-surface-white rounded-2xl p-space-lg shadow-sm border border-border-subtle/60 flex flex-col gap-space-md">
            <div class="flex flex-col md:flex-row md:items-start justify-between gap-space-md">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <span class="font-mono font-bold text-xs text-secondary bg-secondary/10 px-2 py-0.5 rounded">${p.faktur}</span>
                  <span class="text-text-muted">•</span>
                  <span class="text-xs text-text-muted">${p.tanggal}</span>
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-status-selisih-bg text-status-selisih-fg">Selisih Setoran</span>
                </div>
                <h3 class="font-headline-sm text-headline-sm text-text-primary mt-1 font-bold">${p.pengepul} (${p.blokKebun})</h3>
                <p class="text-xs text-text-secondary mt-1">${p.keterangan}</p>
                <div class="flex items-center gap-3 mt-3 text-xs text-text-muted font-mono">
                  <span>Berat: <strong>${DocEngine.formatRibuan(p.beratKg)} kg</strong></span>
                  <span>Nilai: <strong>${DocEngine.formatRupiah(p.totalJual)}</strong></span>
                  <span>Disetor: <strong class="text-status-lunas-fg">${DocEngine.formatRupiah(p.disetor)}</strong></span>
                </div>
              </div>
              <div class="text-left md:text-right bg-status-selisih-bg/40 p-3 rounded-xl border border-status-selisih-fg/10">
                <span class="text-[11px] text-status-selisih-fg uppercase font-bold tracking-wider">Defisit Selisih</span>
                <p class="font-stat-display text-stat-display text-status-selisih-fg font-bold">-${DocEngine.formatRupiah(Math.abs(p.selisih))}</p>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-1 border-t border-border-subtle/60">
              ${isKoordinator ? `
                <button onclick="App.handleActionApproval('${p.id}', 'PENJUALAN', 'Disetujui', 'Disetujui sebagai toleransi susut wajar')" class="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-on-primary hover:bg-primary-container transition-all shadow-sm flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[16px]">verified</span>
                  <span>Verifikasi & Selesaikan Selisih</span>
                </button>
              ` : `
                <span class="text-xs text-text-muted italic">Login sebagai Koordinator untuk menyelesaikan kasus ini.</span>
              `}
            </div>
          </div>
        `).join('');
      }
    }

    // Render Stream Audit Log 24 Jam
    const containerLog = document.getElementById('audit-log-stream');
    if (containerLog) {
      const logs = Store.getAuditLog();
      containerLog.innerHTML = logs.map(l => `
        <div class="flex items-start gap-2.5 pb-2.5 border-b border-border-subtle/40 last:border-0">
          <span class="w-2 h-2 rounded-full mt-1.5 ${l.tipe === 'Disetujui' ? 'bg-status-lunas-fg' : (l.tipe === 'Ditolak' ? 'bg-status-ditolak-fg' : 'bg-status-disetujui-fg')}"></span>
          <div class="flex-1">
            <p class="text-xs text-text-primary leading-tight font-medium">${l.desc}</p>
            <p class="text-[10px] text-text-muted font-mono mt-0.5">${l.waktu}</p>
          </div>
        </div>
      `).join('');
    }
  }

  // =========================================================================
  // 8. RENDER LAPORAN & DOKUMEN CETAK RESMI (SCREEN 4)
  // =========================================================================
  function renderLaporan(metrics) {
    const list = Store.getPanenList();
    const docList = Store.getDokumenList();
    const latestDoc = docList[0] || {};

    // Render Dynamic Metric Strip
    const elVol = document.getElementById('rep-vol-panen');
    const elBruto = document.getElementById('rep-bruto');
    const elBeban = document.getElementById('rep-beban');
    const elUpah = document.getElementById('rep-upah');
    const elLaba = document.getElementById('rep-laba');

    if (elVol) elVol.innerHTML = `${DocEngine.formatRibuan(metrics.volumeTotalKg)} <span class="text-xs font-normal">kg</span>`;
    if (elBruto) elBruto.textContent = 'Rp ' + (metrics.brutoPenjualan / 1000000).toFixed(2).replace('.', ',') + ' Jt';
    if (elBeban) elBeban.textContent = 'Rp ' + (metrics.totalPengeluaranOps / 1000000).toFixed(2).replace('.', ',') + ' Jt';
    if (elUpah) elUpah.textContent = 'Rp ' + (metrics.totalUpahPetik / 1000000).toFixed(2).replace('.', ',') + ' Jt';
    if (elLaba) elLaba.textContent = 'Rp ' + (metrics.labaBersih / 1000000).toFixed(2).replace('.', ',') + ' Jt';

    // Render Tabel Rekapitulasi
    const tbody = document.getElementById('rep-table-tbody');
    if (tbody) {
      tbody.innerHTML = list.map((item, idx) => `
        <tr class="hover:bg-surface-subtle/50 transition-colors border-b border-border-subtle/40">
          <td class="p-2.5 font-mono text-text-muted text-xs">0${idx + 1}</td>
          <td class="p-2.5 whitespace-nowrap text-xs">${item.tanggal.slice(0, 10)}</td>
          <td class="p-2.5">
            <p class="font-bold text-text-primary text-xs">${item.pengepul}</p>
            <p class="text-text-muted text-[11px]">${item.blokKebun} (${item.grade})</p>
          </td>
          <td class="p-2.5 text-right font-mono font-medium text-xs">${DocEngine.formatRibuan(item.beratKg)} kg</td>
          <td class="p-2.5 text-right font-mono text-xs">${DocEngine.formatRupiah(item.totalJual)}</td>
          <td class="p-2.5 text-right font-mono font-bold text-status-lunas-fg text-xs">${DocEngine.formatRupiah(item.disetor)}</td>
          <td class="p-2.5 text-center text-xs">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${item.status === 'Lunas' ? 'bg-status-lunas-bg text-status-lunas-fg' : 'bg-status-selisih-bg text-status-selisih-fg'} text-[11px] font-semibold">
              <span class="w-1.5 h-1.5 rounded-full ${item.status === 'Lunas' ? 'bg-status-lunas-fg' : 'bg-status-selisih-fg'}"></span>
              ${item.status === 'Lunas' ? 'Lunas Pas' : 'Rekonsiliasi'}
            </span>
          </td>
        </tr>
      `).join('');
    }

    // Totals Bar
    const elTotKg = document.getElementById('rep-total-kg');
    const elTotBruto = document.getElementById('rep-total-bruto');
    const elTotSetor = document.getElementById('rep-total-setor');
    if (elTotKg) elTotKg.textContent = DocEngine.formatRibuan(metrics.volumeTotalKg) + ' kg';
    if (elTotBruto) elTotBruto.textContent = DocEngine.formatRupiah(metrics.brutoPenjualan);
    if (elTotSetor) elTotSetor.textContent = DocEngine.formatRupiah(metrics.nominalDisetor);

    // QR Code Canvas & Verification ID
    const qrContainer = document.getElementById('rep-qr-canvas');
    const elKodeVerif = document.getElementById('rep-kode-verif');
    const kode = latestDoc.kodeVerifikasi || 'MJK-8F2A-99B1-E37C';

    if (qrContainer) {
      qrContainer.innerHTML = DocEngine.generateSvgQr(kode, 80);
    }
    if (elKodeVerif) {
      elKodeVerif.textContent = 'ID: ' + kode;
    }
  }

  // =========================================================================
  // 9. RENDER MASTER DATA (SCREEN 6)
  // =========================================================================
  function renderMasterData() {
    // 1. Roster Tim Pemetik (9 Orang)
    const tbodyTim = document.getElementById('master-tim-tbody');
    if (tbodyTim) {
      const timList = Store.getMasterTim();
      tbodyTim.innerHTML = timList.map((m, idx) => `
        <tr class="hover:bg-surface-subtle/50 transition-colors border-b border-border-subtle/40">
          <td class="py-3 px-3 font-mono text-xs text-text-muted">0${idx + 1}</td>
          <td class="py-3 px-3">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                ${m.initial}
              </div>
              <div>
                <p class="font-bold text-xs text-text-primary flex items-center gap-1.5">
                  <span>${m.nama}</span>
                  ${m.peran_khusus || m.regu.includes('Mandor') ? '<span class="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full">Mandor</span>' : ''}
                </p>
                <p class="text-[11px] text-text-muted font-mono">ID: ${m.id} • ${m.hp}</p>
              </div>
            </div>
          </td>
          <td class="py-3 px-3 text-xs text-text-secondary">${m.regu}</td>
          <td class="py-3 px-3">
            <span class="inline-flex items-center gap-1 font-label-sm text-[11px] px-2 py-0.5 rounded-full ${m.skema.includes('Borongan') ? 'bg-status-disetujui-bg text-status-disetujui-fg' : 'bg-status-tertunda-bg text-status-tertunda-fg'} font-medium">
              ${m.skema}
            </span>
          </td>
          <td class="py-3 px-3 font-mono text-xs font-bold text-text-primary">
            ${DocEngine.formatRupiah(m.tarif)}
            <span class="text-[10px] text-text-muted font-normal">${m.skema.includes('Borongan') ? '/kg' : '/hari'}</span>
            ${m.catatan ? `<span class="block text-[10px] text-secondary font-semibold">${m.catatan}</span>` : ''}
          </td>
          <td class="py-3 px-3 text-center">
            <span class="inline-flex items-center gap-1 font-label-sm text-[11px] px-2 py-0.5 rounded-full bg-status-lunas-bg text-status-lunas-fg font-medium">
              <span class="w-1.5 h-1.5 rounded-full bg-status-lunas-fg"></span>
              ${m.status}
            </span>
          </td>
          <td class="py-3 px-3 text-right">
            <button onclick="App.editPemetikModal('${m.id}')" class="text-text-muted hover:text-primary transition-colors">
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
          </td>
        </tr>
      `).join('');
    }

    // 2. Harga Acuan & SOP Nota
    const containerHarga = document.getElementById('master-harga-container');
    if (containerHarga) {
      const hargaList = Store.getMasterHarga();
      containerHarga.innerHTML = hargaList.map(h => `
        <div class="p-space-md rounded-xl bg-surface-subtle border border-border-subtle/60 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-surface-white font-bold text-primary flex items-center justify-center shadow-sm">
              ${h.badge}
            </div>
            <div>
              <p class="font-bold text-xs text-text-primary">${h.grade}</p>
              <p class="text-[11px] text-text-muted">${h.desc}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-bold font-mono text-xs text-primary">${DocEngine.formatRupiah(h.tarif)}</p>
            <span class="text-[10px] text-text-muted">/ kilogram</span>
          </div>
        </div>
      `).join('');
    }

    // 3. Blok Kebun & Mitra Pengepul
    const containerBlok = document.getElementById('master-blok-list');
    const containerMitra = document.getElementById('master-mitra-list');
    const masterData = Store.getMasterBlokMitra();

    if (containerBlok && masterData.blokKebun) {
      containerBlok.innerHTML = masterData.blokKebun.map(b => `
        <div class="p-3 rounded-xl bg-surface-subtle border border-border-subtle/50">
          <div class="flex items-center justify-between">
            <p class="font-bold text-xs text-text-primary">${b.nama}</p>
            <span class="text-[10px] text-status-lunas-fg font-semibold bg-status-lunas-bg px-2 py-0.5 rounded-full">${b.status}</span>
          </div>
          <p class="text-[11px] text-text-muted mt-1">${b.luas} • Elevasi ${b.mdpl}</p>
        </div>
      `).join('');
    }

    if (containerMitra && masterData.mitraPengepul) {
      containerMitra.innerHTML = masterData.mitraPengepul.map(m => `
        <div class="p-3 rounded-xl bg-surface-subtle border border-border-subtle/50 flex items-center justify-between">
          <div>
            <p class="font-bold text-xs text-text-primary">${m.nama}</p>
            <p class="text-[11px] text-text-muted">${m.tipe} (${m.pasar})</p>
          </div>
          <span class="font-mono text-xs text-text-muted bg-surface-white px-2 py-0.5 rounded shadow-sm">${m.id}</span>
        </div>
      `).join('');
    }
  }

  // =========================================================================
  // 10. INTERACTIVE ACTIONS & EVENT HANDLERS
  // =========================================================================
  function handleFormSubmitPenjualan(e) {
    e.preventDefault();
    const berat = Number(document.getElementById('input-panen-berat')?.value || 0);
    const harga = Number(document.getElementById('input-panen-harga')?.value || 0);
    const setor = Number(document.getElementById('input-panen-setor')?.value || 0);
    const tgl = document.getElementById('input-panen-tanggal')?.value;
    const blok = document.getElementById('input-panen-blok')?.value;
    const pengepul = document.getElementById('input-panen-pengepul')?.value;
    const alasan = document.getElementById('input-panen-alasan')?.value;

    if (berat <= 0 || harga <= 0) {
      showToast('Berat bersih dan harga harus bernilai positif!', 'error');
      return;
    }

    const payload = {
      tanggal: tgl,
      blokKebun: blok,
      namaPengepul: pengepul,
      beratBersih: berat,
      hargaSatuan: harga,
      nominalDisetor: setor,
      keterangan: alasan,
      notaUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80'
    };

    // Optimistic Save
    const saved = Store.addPenjualan(payload);
    showToast(`Transaksi ${saved.faktur} berhasil dicatat! Status: ${saved.status}`, 'success');

    // Reset Form
    document.getElementById('input-panen-berat').value = 1000;
    document.getElementById('input-panen-setor').value = 1000 * harga;
    recalcInputPanenLive();
    renderRecentPanenList();

    // Background sync ke GAS REST API
    ApiClient.request('simpanPenjualan', payload).then(res => {
      console.log('Sync simpanPenjualan:', res);
    });
  }

  function handleActionApproval(idTarget, tipe, keputusan, catatan = '') {
    Store.prosesApproval({ idTarget, tipe, keputusan, catatan });
    showToast(`${tipe} ${idTarget} berhasil ${keputusan.toLowerCase()}!`, 'success');
    renderAuditApproval();

    // Background sync
    ApiClient.request('prosesApproval', { idTarget, tipe, keputusan, catatan }).then(res => {
      console.log('Sync approval:', res);
    });
  }

  function handlePostingUpahKeKas() {
    const upahList = Store.getUpahList();
    const payload = {
      tanggal: new Date().toISOString().slice(0, 10),
      keterangan: 'Batch Panen Terverifikasi',
      anggotaList: upahList
    };

    const res = Store.addRekapUpah(payload);
    showToast(`Upah berhasil diposting ke Jurnal Kas (${res.kasId}) sebesar ${DocEngine.formatRupiah(res.totalUpah)}!`, 'success');
    navigateTo('kas-operasional');
  }

  function handleTerbitkanDokumenResmi() {
    DocEngine.terbitkanDokumen({
      jenis: 'Rekap Panen & Laba Bersih',
      periode: 'Agustus 2026'
    }).then(doc => {
      showToast(`Dokumen resmi No. ${doc.nomor} berhasil diterbitkan dengan QR ${doc.kodeVerifikasi}!`, 'success');
      renderLaporan(Store.getCalculatedMetrics());
    });
  }

  function handleCetakLaporan() {
    window.print();
  }

  function handleEksporExcel() {
    const list = Store.getPanenList();
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'ID Panen,Faktur,Tanggal,Blok Kebun,Pengepul,Berat (kg),Harga/kg,Total Jual,Disetor,Selisih,Status\n';

    list.forEach(p => {
      csvContent += `"${p.id}","${p.faktur}","${p.tanggal}","${p.blokKebun}","${p.pengepul}",${p.beratKg},${p.hargaKg},${p.totalJual},${p.disetor},${p.selisih},"${p.status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Panen_Manggis_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Berkas CSV Rekapitulasi berhasil diunduh!', 'success');
  }

  // =========================================================================
  // 11. LOGIN & AUTENTIKASI RBAC
  // =========================================================================
  function handleLoginSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('login-username')?.value;
    const password = document.getElementById('login-password')?.value;

    ApiClient.request('login', { username, password }).then(res => {
      if (res.success) {
        Store.setCurrentUser(res.user, res.token);
        showToast(`Selamat datang kembali, ${res.user.nama}!`, 'success');
        navigateTo('dashboard');
      } else {
        showToast(res.message || 'Login gagal. Periksa username dan password.', 'error');
      }
    });
  }

  function handleQuickLogin(role) {
    const acc = role === 'koordinator' ? APP_CONFIG.DEMO_ACCOUNTS.koordinator : APP_CONFIG.DEMO_ACCOUNTS.bendahara;
    document.getElementById('login-username').value = acc.username;
    document.getElementById('login-password').value = acc.password;

    ApiClient.request('login', { username: acc.username, password: acc.password }).then(res => {
      if (res.success) {
        Store.setCurrentUser(res.user, res.token);
        showToast(`Masuk sebagai ${res.user.nama} (${res.user.role})`, 'success');
        navigateTo('dashboard');
      }
    });
  }

  function handleLogout() {
    Store.setCurrentUser(null, '');
    showToast('Anda telah keluar dari sesi pengurus BUMDes.', 'warning');
    navigateTo('dashboard');
  }

  // =========================================================================
  // 12. MODAL & TOAST SYSTEM
  // =========================================================================
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `toast-item ${type}`;
    let icon = 'check_circle';
    if (type === 'error') icon = 'error';
    if (type === 'warning') icon = 'warning';

    el.innerHTML = `
      <span class="material-symbols-outlined text-[20px]">${icon}</span>
      <span>${message}</span>
    `;

    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(40px)';
      el.style.transition = 'all 0.3s ease';
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  function showNotaModal(title, imgUrl, desc) {
    const modal = document.getElementById('modal-nota');
    if (!modal) return;
    document.getElementById('modal-nota-title').textContent = 'Bukti Nota / Faktur: ' + title;
    document.getElementById('modal-nota-desc').textContent = desc || 'Nota asli tersimpan di arsip digital BUMDes Manggis Jaya Mandiri.';
    const img = document.getElementById('modal-nota-img');
    if (img) img.src = imgUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80';
    modal.classList.add('active');
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
  }

  function showVerificationModal(kode) {
    const res = DocEngine.verifikasiKode(kode);
    const modal = document.getElementById('modal-verifikasi');
    if (!modal) return;

    document.getElementById('modal-verif-kode').textContent = kode;
    document.getElementById('modal-verif-status').textContent = res.valid ? 'ASLI & TERDAFTAR (SHA-256 Valid)' : 'KODE TIDAK DITEMUKAN';
    document.getElementById('modal-verif-status').className = res.valid 
      ? 'px-3 py-1 rounded-full text-xs font-bold bg-status-lunas-bg text-status-lunas-fg inline-block' 
      : 'px-3 py-1 rounded-full text-xs font-bold bg-status-ditolak-bg text-status-ditolak-fg inline-block';
    document.getElementById('modal-verif-desc').textContent = res.message;

    modal.classList.add('active');
  }

  // =========================================================================
  // 13. INISIALISASI APLIKASI
  // =========================================================================
  function init() {
    initRouter();

    // Subscribe store perubahan data
    Store.subscribe(() => {
      renderCurrentView(currentView);
    });

    // Event input panen live kalkulasi
    const beratInput = document.getElementById('input-panen-berat');
    const hargaInput = document.getElementById('input-panen-harga');
    const setorInput = document.getElementById('input-panen-setor');

    if (beratInput) beratInput.addEventListener('input', recalcInputPanenLive);
    if (hargaInput) hargaInput.addEventListener('input', recalcInputPanenLive);
    if (setorInput) setorInput.addEventListener('input', recalcInputPanenLive);

    // Form submit handlers
    const formPanen = document.getElementById('form-input-panen');
    if (formPanen) formPanen.addEventListener('submit', handleFormSubmitPenjualan);

    const formLogin = document.getElementById('form-login');
    if (formLogin) formLogin.addEventListener('submit', handleLoginSubmit);

    console.log('🚀 ManggisKas Desa Frontend Ready! Versi:', APP_CONFIG.VERSION);
  }

  return {
    init,
    navigateTo,
    showNotaModal,
    closeModal,
    showVerificationModal,
    showToast,
    handleQuickLogin,
    handleActionApproval,
    handlePostingUpahKeKas,
    handleTerbitkanDokumenResmi,
    handleCetakLaporan,
    handleEksporExcel,
    switchAuditTab: function (tabId) {
      activeAuditTab = tabId;
      document.getElementById('tab-btn-1')?.classList.toggle('bg-primary-container', tabId === 'tab-1');
      document.getElementById('tab-btn-1')?.classList.toggle('text-on-primary', tabId === 'tab-1');
      document.getElementById('tab-btn-2')?.classList.toggle('bg-primary-container', tabId === 'tab-2');
      document.getElementById('tab-btn-2')?.classList.toggle('text-on-primary', tabId === 'tab-2');

      const elTab1 = document.getElementById('audit-tab-content-1');
      const elTab2 = document.getElementById('audit-tab-content-2');
      if (elTab1) elTab1.style.display = tabId === 'tab-1' ? 'flex' : 'none';
      if (elTab2) elTab2.style.display = tabId === 'tab-2' ? 'flex' : 'none';
    },
    switchMasterTab: function (tabId, btn) {
      document.querySelectorAll('.master-tab-btn').forEach(b => {
        b.className = 'master-tab-btn inline-flex items-center gap-space-sm px-space-lg py-2 rounded-xl font-label-md text-label-md text-text-secondary hover:text-text-primary hover:bg-surface-white transition-all text-xs';
      });
      if (btn) btn.className = 'master-tab-btn active inline-flex items-center gap-space-sm px-space-lg py-2 rounded-xl font-label-md text-label-md bg-primary text-on-primary shadow-sm transition-all text-xs';

      document.querySelectorAll('.master-tab-pane').forEach(p => p.style.display = 'none');
      const targetPane = document.getElementById(tabId);
      if (targetPane) targetPane.style.display = 'flex';
    },
    toggleUpahSkema: function (skema) {
      upahSkemaActive = skema;
      const bBorongan = document.getElementById('btn-skema-borongan');
      const bHarian = document.getElementById('btn-skema-harian');
      if (bBorongan) bBorongan.className = skema === 'borongan' ? 'px-3 py-1 rounded-lg text-xs font-bold bg-primary text-on-primary' : 'px-3 py-1 rounded-lg text-xs font-semibold text-text-secondary';
      if (bHarian) bHarian.className = skema === 'harian' ? 'px-3 py-1 rounded-lg text-xs font-bold bg-primary text-on-primary' : 'px-3 py-1 rounded-lg text-xs font-semibold text-text-secondary';
      showToast(`Skema upah dialihkan ke: ${skema.toUpperCase()}`, 'info');
    }
  };
})();

// Jalankan App saat DOM siap
document.addEventListener('DOMContentLoaded', App.init);
