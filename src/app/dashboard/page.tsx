import { MonitoringDashboard } from '@/components/dashboard/monitoring-dashboard';

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <MonitoringDashboard />
    </div>
  );
}
