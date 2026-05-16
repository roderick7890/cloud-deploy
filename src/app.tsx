import HomePage from "@/pages/index";
import LegacyPage from "@/pages/legacy";
import { Web3Provider } from "@/components/providers/web3-provider";

export function App() {
  const Page = window.location.pathname === "/legacy" ? LegacyPage : HomePage;

  return (
    <Web3Provider>
      <Page />
    </Web3Provider>
  );
}
