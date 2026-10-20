import { useEffect, useRef, useState } from 'react';
import { Button, Card, Badge } from './ui';
import {
  BACKUP_VERSION,
  BackupError,
  ensurePersistentStorage,
  exportBackup,
  importBackupFile,
  storageUsage,
} from './backup';

type Status = { kind: 'idle' | 'ok' | 'error' | 'busy'; message?: string };

/**
 * Card de backup para a aba Config do perfil.
 * Só precisa ser montado uma vez: <BackupCard />
 */
export default function BackupCard() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [storage, setStorage] = useState<
    Awaited<ReturnType<typeof storageUsage>>
  >(null);
  const [persistent, setPersistent] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const ok = await ensurePersistentStorage();
      const usage = await storageUsage();
      if (!alive) return;
      setPersistent(ok);
      setStorage(usage);
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function handleExport() {
    setStatus({ kind: 'busy' });
    try {
      const result = await exportBackup();
      setStatus({
        kind: 'ok',
        message:
          result === 'shared'
            ? 'Backup gerado. Salve o arquivo no app que você escolheu.'
            : 'Backup baixado. Guarde o arquivo fora do celular.',
      });
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Falha ao exportar.',
      });
    }
  }

  function pickFile() {
    fileInput.current?.click();
  }

  function handleFileChosen(file: File | undefined) {
    if (!file) return;
    setPendingFile(file);
    setStatus({ kind: 'idle' });
  }

  async function confirmImport() {
    if (!pendingFile) return;
    setStatus({ kind: 'busy' });
    try {
      const { restored } = await importBackupFile(pendingFile, {
        clearFirst: true,
      });
      setPendingFile(null);
      setStatus({
        kind: 'ok',
        message: `${restored} registros restaurados. Recarregando…`,
      });
      // recarrega para todas as queries refletirem os dados restaurados
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      setStatus({
        kind: 'error',
        message:
          err instanceof BackupError
            ? err.message
            : 'Não foi possível restaurar. O banco atual foi mantido intacto.',
      });
      setPendingFile(null);
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-text-0 font-display">
            Backup dos dados
          </div>
          <div className="text-[11px] text-text-3 mt-0.5">
            Tudo o que você registra fica só neste navegador.
          </div>
        </div>
        <Badge variant={persistent ? 'success' : 'warn'}>
          {persistent ? 'protegido' : 'sem proteção'}
        </Badge>
      </div>

      {persistent === false && (
        <p className="text-[11px] text-warn leading-relaxed">
          O navegador pode apagar esses dados se o celular ficar sem espaço. Exporte
          um backup de vez em quando.
        </p>
      )}

      {storage && (
        <div className="text-[11px] font-mono-ui uppercase tracking-wider text-text-3">
          {storage.usageMb} MB usados · limite ~{storage.quotaMb} MB
        </div>
      )}

      <div className="flex gap-2">
        <Button className="flex-1" onClick={handleExport}>
          Exportar
        </Button>
        <Button variant="secondary" className="flex-1" onClick={pickFile}>
          Importar
        </Button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          handleFileChosen(e.target.files?.[0]);
          // permite escolher o mesmo arquivo de novo
          e.target.value = '';
        }}
      />

      {pendingFile && (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-3 space-y-2">
          <div className="text-xs font-semibold text-danger">
            Substituir todos os dados atuais?
          </div>
          <div className="text-[11px] text-text-2 leading-relaxed">
            Vou importar <span className="font-mono-ui">{pendingFile.name}</span> e
            apagar os treinos, sessões, dieta e medidas que estão neste aparelho.
          </div>
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              className="flex-1"
              onClick={confirmImport}
            >
              Substituir
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setPendingFile(null)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {status.message && (
        <p
          role="status"
          className={`text-[11px] leading-relaxed ${
            status.kind === 'error'
              ? 'text-danger'
              : status.kind === 'busy'
                ? 'text-text-3'
                : 'text-success'
          }`}
        >
          {status.message}
        </p>
      )}

      <p className="text-[11px] text-text-3 font-mono-ui uppercase tracking-wider">
        Formato v{BACKUP_VERSION} · JSON
      </p>
    </Card>
  );
}
