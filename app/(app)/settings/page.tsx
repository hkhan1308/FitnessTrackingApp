import { SettingsPanel } from "@/components/settings-panel";
import { getProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getProfile();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Goals, appearance, and backups.</p>
      </div>
      <SettingsPanel profile={profile} />
    </div>
  );
}
