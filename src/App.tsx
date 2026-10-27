import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell, GlobalLayer } from "./components/Shell";
import { useStore } from "./lib/store";
import Landing from "./pages/Landing";
import { Onboarding, SignIn } from "./pages/Auth";
import Home from "./pages/Home";
import NewBuild from "./pages/NewBuild";
import Import from "./pages/Import";
import { AgentBuilder, AgentsList } from "./pages/Agents";
import Templates from "./pages/Templates";
import { MyProjects, PublishedProjects, SharedProjects } from "./pages/ProjectPages";
import { Community, DesignSystems, Discover, HowItWorks, PromptLibrary, Resources } from "./pages/GetStarted";
import Approvals from "./pages/Approvals";
import Integrations from "./pages/Integrations";
import { Billing, Credits, Docs, Settings, Team } from "./pages/Account";
import Workspace from "./pages/workspace/Workspace";
import BuildTab from "./pages/workspace/BuildTab";
import CodeTab from "./pages/workspace/CodeTab";
import AgentsTab from "./pages/workspace/AgentsTab";
import DataTab from "./pages/workspace/DataTab";
import GithubTab from "./pages/workspace/GithubTab";
import ReadinessTab from "./pages/workspace/ReadinessTab";
import DeployTab from "./pages/workspace/DeployTab";
import ObserveTab from "./pages/workspace/ObserveTab";
import EvalsTab from "./pages/workspace/EvalsTab";
import SettingsTab from "./pages/workspace/SettingsTab";

function Splash() {
  return <div className="min-h-screen flex items-center justify-center font-mono text-[0.7rem] text-dim">loading…</div>;
}

function RequireUser({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useStore();
  if (authLoading) return <Splash />;
  return user ? <>{children}</> : <Navigate to="/signin" replace />;
}

/** Signed-in users land straight in the app (sidebar + home); visitors see the marketing page. */
function RootRoute() {
  const { user, authLoading } = useStore();
  if (authLoading) return <Splash />;
  return user ? <Navigate to="/app" replace /> : <Landing />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/app"
          element={
            <RequireUser>
              <AppShell />
            </RequireUser>
          }
        >
          <Route index element={<Home />} />
          <Route path="projects" element={<MyProjects />} />
          <Route path="published" element={<PublishedProjects />} />
          <Route path="shared" element={<SharedProjects />} />
          <Route path="usage" element={<Credits />} />
          <Route path="marketplace" element={<Templates />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="prompts" element={<PromptLibrary />} />
          <Route path="discover" element={<Discover />} />
          <Route path="resources" element={<Resources />} />
          <Route path="design-systems" element={<DesignSystems />} />
          <Route path="community" element={<Community />} />
          <Route path="new" element={<NewBuild />} />
          <Route path="import" element={<Import />} />
          <Route path="agents" element={<AgentsList />} />
          <Route path="agents/new" element={<AgentBuilder />} />
          <Route path="templates" element={<Navigate to="/app/marketplace" replace />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="credits" element={<Navigate to="/app/usage" replace />} />
          <Route path="billing" element={<Billing />} />
          <Route path="team" element={<Team />} />
          <Route path="settings" element={<Settings />} />
          <Route path="docs" element={<Docs />} />
          <Route path="p/:id" element={<Workspace />}>
            <Route index element={<BuildTab />} />
            <Route path="code" element={<CodeTab />} />
            <Route path="agents" element={<AgentsTab />} />
            <Route path="data" element={<DataTab />} />
            <Route path="github" element={<GithubTab />} />
            <Route path="readiness" element={<ReadinessTab />} />
            <Route path="deploy" element={<DeployTab />} />
            <Route path="observe" element={<ObserveTab />} />
            <Route path="evals" element={<EvalsTab />} />
            <Route path="settings" element={<SettingsTab />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GlobalLayer />
    </>
  );
}
