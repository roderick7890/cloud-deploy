import HomePage from "@/pages/index";
import LegacyPage from "@/pages/legacy";
import { Web3Provider } from "@/components/providers/web3-provider";
import { routes } from "@/config/routes-config";

function getRoutePath(pathname: string) {
  const basePath = new URL(import.meta.env.BASE_URL, window.location.origin).pathname.replace(/\/$/, "");

  if (basePath && pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length);
  }

  if (pathname.endsWith(routes.legacy)) {
    return routes.legacy;
  }

  return pathname;
}

export function App() {
  const Page = getRoutePath(window.location.pathname) === routes.legacy ? LegacyPage : HomePage;

  return (
    <Web3Provider>
      <Page />
    </Web3Provider>
  );
}
