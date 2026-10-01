import { useEffect, useState } from 'react';
import { getProfile, saveProfile, type Profile } from './db';

interface Props {
  onBack: () => void;
}

export default function ProfileView({ onBack }: Props) {
  const [form, setForm] = useState<Omit<Profile, 'id' | 'updatedAt'>>({
    name: '',
    weightKg: 75,
    heightCm: 175,
    age: 30,
    sex: 'M',
    restSeconds: 90,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      if (p) {
        const { id, updatedAt, ...rest } = p;
        setForm(rest);
      }
    });
  }, []);

  async function handleSave() {
    await saveProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">👤 Perfil</h1>
        <button
          onClick={onBack}
          className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg"
        >
          Voltar
        </button>
      </div>

      <section className="bg-zinc-900 rounded-2xl p-4 space-y-4">
        <Field label="Nome">
          <input
            className="w-full bg-zinc-800 rounded-lg px-3 py-2 outline-none"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Como quer ser chamado"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso (kg)">
            <input
              className="w-full bg-zinc-800 rounded-lg px-3 py-2 outline-none"
              inputMode="decimal"
              value={form.weightKg}
              onChange={(e) =>
                setForm({ ...form, weightKg: parseFloat(e.target.value) || 0 })
              }
            />
          </Field>
          <Field label="Altura (cm)">
            <input
              className="w-full bg-zinc-800 rounded-lg px-3 py-2 outline-none"
              inputMode="numeric"
              value={form.heightCm}
              onChange={(e) =>
                setForm({ ...form, heightCm: parseInt(e.target.value) || 0 })
              }
            />
          </Field>
        </div>

        <Field label="Descanso padrão (segundos)">
          <input
            className="w-full bg-zinc-800 rounded-lg px-3 py-2 outline-none"
            inputMode="numeric"
            value={form.restSeconds}
            onChange={(e) =>
              setForm({ ...form, restSeconds: parseInt(e.target.value) || 60 })
            }
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Idade">
            <input
              className="w-full bg-zinc-800 rounded-lg px-3 py-2 outline-none"
              inputMode="numeric"
              value={form.age}
              onChange={(e) =>
                setForm({ ...form, age: parseInt(e.target.value) || 0 })
              }
            />
          </Field>
          <Field label="Sexo">
            <div className="flex gap-2">
              <button
                onClick={() => setForm({ ...form, sex: 'M' })}
                className={`flex-1 py-2 rounded-lg ${
                  form.sex === 'M'
                    ? 'bg-emerald-600'
                    : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
              >
                Masculino
              </button>
              <button
                onClick={() => setForm({ ...form, sex: 'F' })}
                className={`flex-1 py-2 rounded-lg ${
                  form.sex === 'F'
                    ? 'bg-emerald-600'
                    : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
              >
                Feminino
              </button>
            </div>
          </Field>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-semibold"
        >
          {saved ? '✅ Salvo!' : 'Salvar perfil'}
        </button>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
