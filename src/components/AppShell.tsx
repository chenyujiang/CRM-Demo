import { NavLink, Outlet } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/contacts", label: "Contacts" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/tasks", label: "Tasks" },
  { to: "/dashboard", label: "Dashboard" },
];

export function AppShell() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold">CRM Demo</span>
        <nav aria-label="Main" className="flex gap-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "text-sm font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Button variant="outline" size="sm" onClick={() => void signOut()}>
          Log out
        </Button>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
