// ==================================================
// EngLearn — PWA kaydı (servis çalışanı)
// ==================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('sw.js', { scope: './' })
            .catch(() => { /* kayıt başarısızsa sessizce geç */ });
    });
}
