export type Program = {
  id: string;
  name: string;
  goal: string | null;
  start_date: string | null;
  target_date: string | null;
  status: string;
  notes: string | null;
  principles: string | null;
};

export type Phase = {
  id: string;
  program_id: string;
  position: number;
  name: string;
  focus: string | null;
  progression_criteria: string | null;
  started_on: string | null;
  completed_on: string | null;
};

export type Exercise = {
  id: string;
  name: string;
  category: string | null;
  cues: string | null;
  status: "allowed" | "avoid" | "progressing" | string;
  status_note: string | null;
};

export type SetLog = {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_s: number | null;
  pain: number | null;
};

export type WorkoutExercise = {
  id: string;
  workout_id: string;
  block: string;
  position: number;
  sets: number | null;
  reps: string | null;
  duration_s: number | null;
  rest_s: number | null;
  intensity: string | null;
  notes: string | null;
  completed_at: string | null;
  exercise: Exercise;
  set_logs: SetLog[];
};

export type Reflection = {
  id: string;
  workout_id: string;
  pain_during: number | null;
  pain_during_where: string | null;
  pain_next_morning: number | null;
  squeeze_effort: number | null;
  squeeze_pain: number | null;
  energy: number | null;
  journal_prompt: string | null;
  journal: string | null;
  coach_notes: string | null;
  created_at: string;
};

export type Workout = {
  id: string;
  program_id: string | null;
  phase_id: string | null;
  session_number: number | null;
  title: string;
  status: "planned" | "done" | "skipped" | string;
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  est_duration_min: number | null;
  rules: string | null;
  notes: string | null;
  is_favorite: boolean;
  rating: number | null;
};
