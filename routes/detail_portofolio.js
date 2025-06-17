document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.save-button').addEventListener('click', bukaPopupPapan);
  document.getElementById('popupPapan').querySelector('button').addEventListener('click', tutupPopupPapan);
});

function bukaPopupPapan() {
  const container = document.getElementById('daftarPapan');
  container.innerHTML = '<p>Loading...</p>';

  fetch('/get-papan', { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      container.innerHTML = '';
      if (data.length === 0) {
        container.innerHTML = '<p>Tidak ada papan tersedia.</p>';
      } else {
        data.forEach(p => {
          const item = document.createElement('div');
          item.className = 'item-papan';
          item.onclick = () => simpanKePapan(p.id_papan);

          item.innerHTML = `
            <img src="/uploads/${p.gambar ? p.gambar : 'default.jpg'}" class="gambar-papan" />
            <span>${p.nama_papan}</span>
          `;
          container.appendChild(item);
        });
      }
    })
    .catch(err => {
      console.error('Fetch error:', err);
      container.innerHTML = '<p>Gagal memuat papan.</p>';
    });

  document.getElementById('popupPapan').style.display = 'flex';
}

function tutupPopupPapan() {
  document.getElementById('popupPapan').style.display = 'none';
}

function simpanKePapan(idPapan) {
  const idPortofolio = document.getElementById('idPortofolio')?.value;

  if (!idPortofolio) {
    alert('❌ ID portofolio tidak ditemukan.');
    return;
  }

  fetch('/simpan-ke-papan', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_papan: idPapan, id_portofolio: idPortofolio })
  })
  .then(res => res.json())
  .then(data => {
  if (data.success) {
    alert('✅ Berhasil disimpan ke papan!');
    tutupPopupPapan();
    // Redirect ke halaman papan (lihat portofolio yang barusan ditambahkan)
    window.location.href = `/portofolio_papan/${idPapan}`;
  } else {
    alert('❌ Portofolio sudah pernah disimpan.');
  }
})

  .catch(err => {
    console.error('POST error:', err);
    alert('❌ Terjadi kesalahan saat menyimpan.');
  });
}

