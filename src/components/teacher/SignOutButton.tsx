"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/primitives";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        await getSupabase().auth.signOut();
        router.replace("/profesor/login");
        router.refresh();
      }}
    >
      <LogOut className="h-4 w-4" /> Cerrar sesión
    </Button>
  );
}
