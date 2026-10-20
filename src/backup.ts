import { db } from './db';

/* ══════════════════════════════════════════════════════════
   BACKUP — exportar / importar o banco inteiro em JSON

   Hoje tudo vive em IndexedDB, sem nenhuma cópia. Cenários
   reais de perda total: "limpar dados do site", despejo de
   storage pelo iOS, trocar de celular, reinstalar o PWA.
   ══════════════════════════════════════════════════════════ */

export const BACKUP_FORMAT = 'gym-home-prod.backup';
export const BACKUP_VERSION = 1;

/** Tabelas que entram no backup (todas as do db.ts). */
export const BACKUP_TABLES = [
  'workouts',
  'exercises',
  'sessions',
  'sets',
  'profile',
  'meta',
  'achievements',
  'bodyMeasurements',
  'dailyLogs',
  'somatotypes',
  'foods',
  'mealEntries',
  'nutritionGoals',
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  counts: Partial<Record<BackupTable, number>>;
  data: Partial<Record<BackupTable, unknown[]>>;
}

export class BackupError extends Error {}

/* ────────── acesso dinâmico às tabelas ────────── */

type UnknownTable = {
  toArray(): Promise<unknown[]>;
  bulkAdd(rows: unknown[]): Promise<unknown>;
  clear(): Promise<void>;
  count(): Promise<number>;
};

function table(name: BackupTable): UnknownTable {
  const found = (db as unknown as Record<string, UnknownTable | undefined>)[name];
  if (!found) throw new BackupError(`Tabela "${name}" não existe no banco.`);
  return found;
}

/* ────────── exportar ────────── */

export async function buildBackup(): Promise<BackupFile> {
  const data: BackupFile['data'] = {};
  const counts: BackupFile['counts'] = {};

  // Snapshot consistente: nada é gravado enquanto lemos.
  await db.transaction('r', db.tables, async () => {
    for (const name of BACKUP_TABLES) {
      const rows = await table(name).toArray();
      data[name] = rows;
      counts[name] = rows.length;
    }
  });

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    counts,
    data,
  };
}

export function backupFileName(now = new Date()): string {
  const iso = now.toISOString().slice(0, 10);
  return `treino-backup-${iso}.json`;
}

/**
 * Exporta e tenta compartilhar pelo menu nativo (melhor no iOS,
 * onde download de arquivo é confuso). Cai para download se o
 * Web Share de arquivos não existir.
 */
export async function exportBackup(): Promise<'shared' | 'downloaded'> {
  const backup = await buildBackup();
  const file = new File([JSON.stringify(backup, null, 2)], backupFileName(), {
    type: 'application/json',
  });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Backup do treino' });
      return 'shared';
    } catch {
      // usuário cancelou ou o share falhou: segue para o download
    }
  }

  downloadBlob(file);
  return 'downloaded';
}

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFileName();
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // dá tempo do navegador iniciar o download antes de revogar
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/* ────────── importar ────────── */

export function parseBackup(text: string): BackupFile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BackupError('O arquivo não é um JSON válido.');
  }

  if (!json || typeof json !== 'object') {
    throw new BackupError('Backup inválido.');
  }

  const candidate = json as Partial<BackupFile>;

  if (candidate.format !== BACKUP_FORMAT) {
    throw new BackupError('Esse arquivo não parece ser um backup do app de treino.');
  }
  if (typeof candidate.version !== 'number') {
    throw new BackupError('Backup sem número de versão.');
  }
  if (candidate.version > BACKUP_VERSION) {
    throw new BackupError(
      `Backup da versão ${candidate.version}, mas o app entende até a ${BACKUP_VERSION}. Atualize o app antes de importar.`
    );
  }
  if (!candidate.data || typeof candidate.data !== 'object') {
    throw new BackupError('Backup sem dados.');
  }
  if (typeof candidate.exportedAt !== 'string') {
    throw new BackupError('Backup sem data de exportação.');
  }

  return candidate as BackupFile;
}

/**
 * Restaura o backup. Por padrão SUBSTITUI todos os dados atuais
 * (é o que se espera ao restaurar de um backup completo).
 * Tudo em uma transação: se algo falhar, o banco fica como estava.
 */
export async function restoreBackup(
  backup: BackupFile,
  { clearFirst = true }: { clearFirst?: boolean } = {}
): Promise<{ restored: number }> {
  let restored = 0;

  await db.transaction('rw', db.tables, async () => {
    if (clearFirst) {
      // Usa db.tables para não esquecer nenhuma tabela nova.
      for (const t of db.tables) {
        await t.clear();
      }
    }

    for (const name of BACKUP_TABLES) {
      const rows = backup.data[name];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      // bulkAdd preserva os ids originais (relações entre tabelas continuam válidas)
      await table(name).bulkAdd(rows);
      restored += rows.length;
    }
  });

  return { restored };
}

/** Lê o File do <input type="file"> e restaura. */
export async function importBackupFile(
  file: File,
  opts?: { clearFirst?: boolean }
): Promise<{ restored: number }> {
  const text = await file.text();
  return restoreBackup(parseBackup(text), opts);
}

/* ────────── resumo legível ────────── */

const LABELS: Partial<Record<BackupTable, [singular: string, plural: string]>> =
  {
    workouts: ['treino', 'treinos'],
    exercises: ['exercício', 'exercícios'],
    sessions: ['sessão', 'sessões'],
    sets: ['série', 'séries'],
    bodyMeasurements: ['medida', 'medidas'],
    dailyLogs: ['registro diário', 'registros diários'],
    mealEntries: ['refeição', 'refeições'],
    foods: ['alimento', 'alimentos'],
    achievements: ['conquista', 'conquistas'],
  };

export function summarizeBackup(
  counts: BackupFile['counts']
): { label: string; value: string }[] {
  return BACKUP_TABLES.filter((name) => (counts[name] ?? 0) > 0).map(
    (name) => {
      const n = counts[name] ?? 0;
      const [one, many] = LABELS[name] ?? [name, name];
      return { label: n === 1 ? one : many, value: String(n) };
    }
  );
}

/* ────────── storage persistente ────────── */

/**
 * Pede ao navegador para não despejar o IndexedDB. Sem isso, o
 * Safari pode limpar os dados de um PWA não instalado após alguns
 * dias sem uso. Retorna true se o armazenamento está protegido.
 */
export async function ensurePersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Uso aproximado de disco, para mostrar no card de backup. */
export async function storageUsage(): Promise<{
  usageMb: number;
  quotaMb: number;
  persistent: boolean;
} | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    const persistent = navigator.storage.persisted
      ? await navigator.storage.persisted()
      : false;
    return {
      usageMb: Math.round((usage / 1024 / 1024) * 10) / 10,
      quotaMb: Math.round(quota / 1024 / 1024),
      persistent,
    };
  } catch {
    return null;
  }
}
