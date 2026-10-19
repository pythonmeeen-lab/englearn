// ==================================================
// EngLearn — Navigasyon (3 çizgi / hamburger menü)
// Sağ üstteki butona basınca kategoriler yukarıdan
// aşağıya doğru açılır. Dışarı tıklama / Esc ile kapanır.
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    const btn = document.getElementById('btn-menu');
    if (!navbar || !btn) return;

    const kapat = () => {
        navbar.classList.remove('menu-acik');
        btn.setAttribute('aria-expanded', 'false');
    };
    const ac = () => {
        navbar.classList.add('menu-acik');
        btn.setAttribute('aria-expanded', 'true');
    };

    // Butona basınca aç/kapa
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        navbar.classList.contains('menu-acik') ? kapat() : ac();
    });

    // Menünün veya butonun dışına tıklayınca kapat
    document.addEventListener('click', (e) => {
        if (!navbar.classList.contains('menu-acik')) return;
        if (!e.target.closest('#nav-menu') && !e.target.closest('#btn-menu')) kapat();
    });

    // Bir kategori seçilince menüyü kapat
    document.querySelectorAll('.nav-menu .nav-links a').forEach((a) => {
        a.addEventListener('click', kapat);
    });

    // Escape tuşu ile kapat
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') kapat();
    });
});
