import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto max-w-md px-5 pb-32 pt-safe">{children}</main>
      <BottomNav />
    </>
  );
}
