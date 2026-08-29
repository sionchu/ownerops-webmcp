import { OwnerOpsApp } from "@/components/ownerops-app";
import { OperatingCommandCenter } from "@/components/operating-command-center";
import { AppStateProvider } from "@/state/app-state";

export default function Home() {
  return (
    <AppStateProvider>
      <OperatingCommandCenter />
      <OwnerOpsApp />
    </AppStateProvider>
  );
}
