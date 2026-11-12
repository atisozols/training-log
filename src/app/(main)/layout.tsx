import { DataProvider } from "@/components/DataProvider";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <DataProvider>{children}</DataProvider>;
}
