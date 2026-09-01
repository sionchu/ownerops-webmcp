import { OwnerOpsApp } from "@/components/ownerops-app";
import { OperatingCommandCenter } from "@/components/operating-command-center";
import { OwnerNavigation } from "@/components/owner-navigation";
import { StoreSurface } from "@/components/store-surface";
import { AppStateProvider } from "@/state/app-state";

export default function Home() {
  return (
    <AppStateProvider>
      <OwnerNavigation />
      <OperatingCommandCenter />
      <OwnerOpsApp />
      <StoreSurface />
    </AppStateProvider>
  );
}
