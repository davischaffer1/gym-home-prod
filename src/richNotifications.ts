/**
 * Notificações ricas estilo Uber/Spotify.
 *
 * Limitações no iPhone:
 * - Só funciona com o PWA INSTALADO na tela inicial
 * - iOS 16.4+
 * - Não atualiza ao vivo (timer) — só texto estático
 * - Ações (botões) aparecem ao pressionar e segurar a notificação
 */

export async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
  
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }
  
  async function getReg(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;
    try {
      return await navigator.serviceWorker.ready;
    } catch {
      return null;
    }
  }
  
  /**
   * Notificação persistente de sessão ativa.
   * Usa o mesmo `tag` para que a próxima SUBSTITUA a anterior (não empilha).
   */
  export async function showActiveSessionNotification(
    workoutName: string,
    startedAt: number
  ) {
    if (!(await requestNotificationPermission())) return;
  
    const reg = await getReg();
    if (!reg) return;
  
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;
  
    const body = `${workoutName} · ${min
      .toString()
      .padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  
    try {
      await reg.showNotification('💪 Treino em andamento', {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'active-session',
        requireInteraction: true,
        silent: true,
        renotify: false,
        data: { type: 'session', startedAt },
        actions: [
          { action: 'open', title: 'Abrir' },
          { action: 'finish', title: 'Encerrar' },
        ],
      } as NotificationOptions);
    } catch (err) {
      console.warn('Erro ao mostrar notificação de sessão:', err);
    }
  }
  
  /**
   * Atualiza a notificação de sessão (chama no intervalo).
   * No iPhone, o mínimo prático é 60s.
   */
  export async function updateActiveSessionNotification(
    workoutName: string,
    startedAt: number
  ) {
    await showActiveSessionNotification(workoutName, startedAt);
  }
  
  /**
   * Remove a notificação de sessão.
   */
  export async function clearActiveSessionNotification() {
    const reg = await getReg();
    if (!reg) return;
    try {
      const notifications = await reg.getNotifications({
        tag: 'active-session',
      });
      notifications.forEach((n) => n.close());
    } catch (err) {
      console.warn('Erro ao limpar notificação de sessão:', err);
    }
  }
  
  /**
   * Notificação de descanso concluído com ações.
   */
  export async function showRestFinishedNotification(exerciseName: string) {
    if (!(await requestNotificationPermission())) return;
  
    const reg = await getReg();
    if (!reg) return;
  
    try {
      await reg.showNotification('⏱ Descanso concluído!', {
        body: `Hora da próxima série — ${exerciseName}`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'rest-timer',
        renotify: true,
        requireInteraction: true,
        data: { type: 'rest', exerciseName },
        actions: [
          { action: '+30s', title: '+30s' },
          { action: 'skip', title: 'Pular' },
          { action: 'finish-session', title: 'Encerrar' },
        ],
      } as NotificationOptions);
    } catch (err) {
      console.warn('Erro ao mostrar notificação de descanso:', err);
    }
  }
  
  /**
   * Notificação de PR batido.
   */
  export async function showPRNotification(
    exerciseName: string,
    weight: number
  ) {
    if (!(await requestNotificationPermission())) return;
  
    const reg = await getReg();
    if (!reg) return;
  
    try {
      await reg.showNotification('🏆 Novo PR!', {
        body: `${exerciseName} · ${weight} kg`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'pr',
        renotify: true,
        data: { type: 'pr', exerciseName, weight },
      } as NotificationOptions);
    } catch (err) {
      console.warn('Erro ao mostrar notificação de PR:', err);
    }
  }
  
  /**
   * Ouve ações da notificação (chamado no App.tsx ou SessionView).
   */
  export function listenToNotificationActions(
    handler: (action: string, data: any) => void
  ) {
    if (!('serviceWorker' in navigator)) return () => {};
  
    const listener = (event: MessageEvent) => {
      if (event.data?.type === 'notification-action') {
        handler(event.data.action, event.data);
      }
    };
  
    navigator.serviceWorker.addEventListener('message', listener);
  
    return () => {
      navigator.serviceWorker.removeEventListener('message', listener);
    };
  }

  /**
 * Notificação "estática" do descanso — lançada IMEDIATAMENTE ao registrar
 * uma série. Serve para o usuário ver o tempo restante na tela bloqueada
 * mesmo que o iOS congele o JS do PWA.
 *
 * Usa a mesma tag "rest-timer" para que a próxima SUBSTITUA a anterior.
 */
export async function showRestStartNotification(
    seconds: number,
    exerciseName: string
  ) {
    if (!(await requestNotificationPermission())) return;
  
    const reg = await getReg();
    if (!reg) return;
  
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    const timeStr = `${min.toString().padStart(2, '0')}:${sec
      .toString()
      .padStart(2, '0')}`;
  
    try {
      await reg.showNotification('⏱ Descanso em andamento', {
        body: `${timeStr} · ${exerciseName}`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'rest-timer',
        renotify: false,
        requireInteraction: false,
        silent: true,
        data: { type: 'rest', seconds },
      } as NotificationOptions);
    } catch (err) {
      console.warn('Erro ao mostrar notificação de descanso:', err);
    }
  }