import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex flex-col flex-1 ml-[240px]">
        <main className="flex-1 px-8 pt-8 pb-8 overflow-auto bg-white">{children}</main>
      </div>
    </div>
  );
}