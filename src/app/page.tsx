import { OwnerOpsApp } from "@/components/ownerops-app";
import { AppStateProvider } from "@/state/app-state";

export default function Home() {
  return (
    <AppStateProvider>
      <OwnerOpsApp />
    </AppStateProvider>
  );
}
