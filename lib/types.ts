export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};
export type Task = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  due_date: string | null;
  created_at: string;
};
export type Finance = {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  created_at: string;
};
export type Project = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  progress: number;
  status: "active" | "paused" | "completed";
  deadline: string | null;
  created_at: string;
};
export type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};
export type NoteLink = {
  id: string;
  user_id: string;
  source_note_id: string;
  target_note_id: string;
  created_at: string;
};
export type PomodoroSession = {
  id: string;
  user_id: string;
  duration_minutes: number;
  completed_at: string;
  created_at: string;
};
export type Tables = {
  profiles: Profile;
  tasks: Task;
  finances: Finance;
  projects: Project;
  notes: Note;
  note_links: NoteLink;
  pomodoro_sessions: PomodoroSession;
};
type Table<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};
export type Database = {
  public: {
    Tables: { [K in keyof Tables]: Table<Tables[K]> };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
export type VaultData = {
  tasks: Task[];
  finances: Finance[];
  projects: Project[];
  notes: Note[];
  note_links: NoteLink[];
  pomodoro_sessions: PomodoroSession[];
};
