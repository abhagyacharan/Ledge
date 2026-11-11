import { TasksHeader } from "@/modules/todos/components/tasks-header";

/** Every Tasks page shares the header with the view tabs, Lists and Search (docs/design.md §5f). */
export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dash">
      <TasksHeader />
      {children}
    </div>
  );
}
