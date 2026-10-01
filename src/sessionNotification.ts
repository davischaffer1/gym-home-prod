let notificationId: string | null = null;

export async function startSessionNotification(
  workoutName: string,
  startedAt: number
) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  updateSessionNotification(workoutName, startedAt);
}

export function updateSessionNotification(
  workoutName: string,
  startedAt: number
) {
  if (Notification.permission !== 'granted') return;

  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;

  // Fecha a anterior (se houver) e cria nova
  // O "tag" garante que não acumula notificações
  new Notification(`💪 ${workoutName}`, {
    body: `⏱ ${min.toString().padStart(2, '0')}:${sec
      .toString()
      .padStart(2, '0')} em andamento`,
    icon: '/icon-192.png',
    tag: 'session-active',
    silent: true,
    requireInteraction: true,
  });
}

export function stopSessionNotification() {
  // Não tem API direta pra fechar. Mudamos o body para "concluído" e
  // deixamos sumir naturalmente, ou usamos um service worker.
  if (Notification.permission === 'granted') {
    new Notification('✅ Treino concluído!', {
      body: 'Bom trabalho! 💪',
      icon: '/icon-192.png',
      tag: 'session-active',
      silent: false,
    });
  }
}
