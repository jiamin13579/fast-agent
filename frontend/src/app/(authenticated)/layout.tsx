import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/layout";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AppLayout>{children}</AppLayout>
    </TooltipProvider>
  );
}