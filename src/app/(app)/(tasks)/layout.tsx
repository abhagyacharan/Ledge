/**
 * Every Tasks page draws its own title (docs/new_design.md screens 2a to 2h): the Overview has
 * the Tasks title with the view chips, the other views a big title with a "‹ Tasks" link on phones.
 */
export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return <div className="dash">{children}</div>;
}
