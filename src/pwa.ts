import { registerSW } from 'virtual:pwa-register';

window.addEventListener('load', () => {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (confirm('Nova versão disponível. Atualizar agora?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log('App pronto para uso offline');
    },
  });
});