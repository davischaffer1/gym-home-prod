export type MuscleGroup =
  | 'Peito'
  | 'Costas'
  | 'Pernas'
  | 'Ombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Core'
  | 'Cardio';

export type Equipment =
  | 'Barra'
  | 'Halteres'
  | 'Máquina'
  | 'Polia'
  | 'Peso corporal'
  | 'Kettlebell'
  | 'Cardio';

export interface LibraryExercise {
  name: string;
  group: MuscleGroup;
  equipment: Equipment;
}

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // ---------- PEITO ----------
  { name: 'Supino reto com barra', group: 'Peito', equipment: 'Barra' },
  { name: 'Supino inclinado com barra', group: 'Peito', equipment: 'Barra' },
  { name: 'Supino declinado com barra', group: 'Peito', equipment: 'Barra' },
  { name: 'Supino reto com halteres', group: 'Peito', equipment: 'Halteres' },
  {
    name: 'Supino inclinado com halteres',
    group: 'Peito',
    equipment: 'Halteres',
  },
  { name: 'Crucifixo reto', group: 'Peito', equipment: 'Halteres' },
  { name: 'Crucifixo inclinado', group: 'Peito', equipment: 'Halteres' },
  { name: 'Crossover na polia alta', group: 'Peito', equipment: 'Polia' },
  { name: 'Crossover na polia média', group: 'Peito', equipment: 'Polia' },
  { name: 'Peck deck (voador)', group: 'Peito', equipment: 'Máquina' },
  { name: 'Supino máquina', group: 'Peito', equipment: 'Máquina' },
  { name: 'Flexão de braço', group: 'Peito', equipment: 'Peso corporal' },
  {
    name: 'Flexão declinada (pés elevados)',
    group: 'Peito',
    equipment: 'Peso corporal',
  },

  // ---------- COSTAS ----------
  { name: 'Barra fixa (pronada)', group: 'Costas', equipment: 'Peso corporal' },
  {
    name: 'Barra fixa (supinada)',
    group: 'Costas',
    equipment: 'Peso corporal',
  },
  { name: 'Puxada frontal na polia', group: 'Costas', equipment: 'Polia' },
  { name: 'Puxada supinada na polia', group: 'Costas', equipment: 'Polia' },
  { name: 'Remada curvada com barra', group: 'Costas', equipment: 'Barra' },
  {
    name: 'Remada unilateral com halter',
    group: 'Costas',
    equipment: 'Halteres',
  },
  { name: 'Remada cavalinho', group: 'Costas', equipment: 'Barra' },
  { name: 'Remada máquina', group: 'Costas', equipment: 'Máquina' },
  { name: 'Remada baixa na polia', group: 'Costas', equipment: 'Polia' },
  { name: 'Pulldown na polia', group: 'Costas', equipment: 'Polia' },
  { name: 'Levantamento terra', group: 'Costas', equipment: 'Barra' },
  { name: 'Pullover com halter', group: 'Costas', equipment: 'Halteres' },
  { name: 'Hiperextensão lombar', group: 'Costas', equipment: 'Peso corporal' },

  // ---------- PERNAS ----------
  { name: 'Agachamento livre', group: 'Pernas', equipment: 'Barra' },
  { name: 'Agachamento frontal', group: 'Pernas', equipment: 'Barra' },
  { name: 'Agachamento búlgaro', group: 'Pernas', equipment: 'Halteres' },
  { name: 'Agachamento sumô', group: 'Pernas', equipment: 'Halteres' },
  { name: 'Leg press 45°', group: 'Pernas', equipment: 'Máquina' },
  { name: 'Hack squat', group: 'Pernas', equipment: 'Máquina' },
  { name: 'Cadeira extensora', group: 'Pernas', equipment: 'Máquina' },
  { name: 'Mesa flexora', group: 'Pernas', equipment: 'Máquina' },
  { name: 'Cadeira flexora', group: 'Pernas', equipment: 'Máquina' },
  { name: 'Stiff com barra', group: 'Pernas', equipment: 'Barra' },
  { name: 'Stiff com halteres', group: 'Pernas', equipment: 'Halteres' },
  { name: 'Afundo com halteres', group: 'Pernas', equipment: 'Halteres' },
  { name: 'Passada caminhando', group: 'Pernas', equipment: 'Halteres' },
  {
    name: 'Elevação pélvica (hip thrust)',
    group: 'Pernas',
    equipment: 'Barra',
  },
  { name: 'Panturrilha em pé', group: 'Pernas', equipment: 'Máquina' },
  { name: 'Panturrilha sentado', group: 'Pernas', equipment: 'Máquina' },
  { name: 'Panturrilha no leg press', group: 'Pernas', equipment: 'Máquina' },
  { name: 'Cadeira adutora', group: 'Pernas', equipment: 'Máquina' },
  { name: 'Cadeira abdutora', group: 'Pernas', equipment: 'Máquina' },

  // ---------- OMBROS ----------
  {
    name: 'Desenvolvimento militar com barra',
    group: 'Ombros',
    equipment: 'Barra',
  },
  {
    name: 'Desenvolvimento com halteres',
    group: 'Ombros',
    equipment: 'Halteres',
  },
  { name: 'Desenvolvimento Arnold', group: 'Ombros', equipment: 'Halteres' },
  { name: 'Desenvolvimento máquina', group: 'Ombros', equipment: 'Máquina' },
  {
    name: 'Elevação lateral com halteres',
    group: 'Ombros',
    equipment: 'Halteres',
  },
  { name: 'Elevação lateral na polia', group: 'Ombros', equipment: 'Polia' },
  {
    name: 'Elevação frontal com halteres',
    group: 'Ombros',
    equipment: 'Halteres',
  },
  { name: 'Elevação frontal com barra', group: 'Ombros', equipment: 'Barra' },
  {
    name: 'Crucifixo inverso (posterior)',
    group: 'Ombros',
    equipment: 'Halteres',
  },
  { name: 'Face pull na polia', group: 'Ombros', equipment: 'Polia' },
  { name: 'Remada alta com barra', group: 'Ombros', equipment: 'Barra' },
  { name: 'Encolhimento com barra', group: 'Ombros', equipment: 'Barra' },
  { name: 'Encolhimento com halteres', group: 'Ombros', equipment: 'Halteres' },

  // ---------- BÍCEPS ----------
  { name: 'Rosca direta com barra', group: 'Bíceps', equipment: 'Barra' },
  { name: 'Rosca direta com barra W', group: 'Bíceps', equipment: 'Barra' },
  {
    name: 'Rosca alternada com halteres',
    group: 'Bíceps',
    equipment: 'Halteres',
  },
  { name: 'Rosca martelo', group: 'Bíceps', equipment: 'Halteres' },
  { name: 'Rosca concentrada', group: 'Bíceps', equipment: 'Halteres' },
  {
    name: 'Rosca inclinada (banco 45°)',
    group: 'Bíceps',
    equipment: 'Halteres',
  },
  { name: 'Rosca Scott', group: 'Bíceps', equipment: 'Barra' },
  { name: 'Rosca na polia baixa', group: 'Bíceps', equipment: 'Polia' },
  { name: 'Rosca inversa', group: 'Bíceps', equipment: 'Barra' },
  { name: 'Rosca spider', group: 'Bíceps', equipment: 'Halteres' },

  // ---------- TRÍCEPS ----------
  { name: 'Supino fechado', group: 'Tríceps', equipment: 'Barra' },
  { name: 'Tríceps testa com barra', group: 'Tríceps', equipment: 'Barra' },
  {
    name: 'Tríceps testa com halteres',
    group: 'Tríceps',
    equipment: 'Halteres',
  },
  { name: 'Tríceps pulley na polia', group: 'Tríceps', equipment: 'Polia' },
  { name: 'Tríceps corda na polia', group: 'Tríceps', equipment: 'Polia' },
  { name: 'Tríceps francês', group: 'Tríceps', equipment: 'Halteres' },
  { name: 'Tríceps coice (kickback)', group: 'Tríceps', equipment: 'Halteres' },
  {
    name: 'Mergulho em paralelas',
    group: 'Tríceps',
    equipment: 'Peso corporal',
  },
  { name: 'Mergulho no banco', group: 'Tríceps', equipment: 'Peso corporal' },
  {
    name: 'Tríceps banco com peso',
    group: 'Tríceps',
    equipment: 'Peso corporal',
  },

  // ---------- CORE ----------
  { name: 'Prancha abdominal', group: 'Core', equipment: 'Peso corporal' },
  { name: 'Prancha lateral', group: 'Core', equipment: 'Peso corporal' },
  { name: 'Abdominal crunch', group: 'Core', equipment: 'Peso corporal' },
  { name: 'Abdominal infra', group: 'Core', equipment: 'Peso corporal' },
  { name: 'Abdominal oblíquo', group: 'Core', equipment: 'Peso corporal' },
  {
    name: 'Elevação de pernas suspenso',
    group: 'Core',
    equipment: 'Peso corporal',
  },
  { name: 'Abdominal na polia (crunch)', group: 'Core', equipment: 'Polia' },
  { name: 'Abdominal máquina', group: 'Core', equipment: 'Máquina' },
  {
    name: 'Roda abdominal (ab wheel)',
    group: 'Core',
    equipment: 'Peso corporal',
  },
  { name: 'Russian twist com anilha', group: 'Core', equipment: 'Halteres' },
  {
    name: 'Elevação de pernas deitado',
    group: 'Core',
    equipment: 'Peso corporal',
  },
  { name: 'Dead bug', group: 'Core', equipment: 'Peso corporal' },

  // ---------- CARDIO ----------
  { name: 'Esteira (corrida)', group: 'Cardio', equipment: 'Cardio' },
  {
    name: 'Esteira (caminhada inclinada)',
    group: 'Cardio',
    equipment: 'Cardio',
  },
  { name: 'Bicicleta ergométrica', group: 'Cardio', equipment: 'Cardio' },
  { name: 'Elíptico', group: 'Cardio', equipment: 'Cardio' },
  { name: 'Escada (stair climber)', group: 'Cardio', equipment: 'Cardio' },
  { name: 'Remo ergômetro', group: 'Cardio', equipment: 'Cardio' },
  { name: 'Pular corda', group: 'Cardio', equipment: 'Peso corporal' },
  { name: 'Burpee', group: 'Cardio', equipment: 'Peso corporal' },

  // ---------- KETTLEBELL ----------
  { name: 'Swing com kettlebell', group: 'Pernas', equipment: 'Kettlebell' },
  { name: 'Levantamento turco', group: 'Core', equipment: 'Kettlebell' },
  { name: 'Goblet squat', group: 'Pernas', equipment: 'Kettlebell' },
];

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Peito',
  'Costas',
  'Pernas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Core',
  'Cardio',
];

export const EQUIPMENTS: Equipment[] = [
  'Barra',
  'Halteres',
  'Máquina',
  'Polia',
  'Peso corporal',
  'Kettlebell',
  'Cardio',
];
