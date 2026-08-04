import ScoutNav from "@/components/ScoutNav";

export default function ScoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScoutNav />
      <main className="min-h-screen">{children}</main>
    </>
  );
}
