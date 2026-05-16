import HomePage from "@/pages/index";
import { Web3Provider } from "@/components/providers/web3-provider";

export function App() {
  return (
    <Web3Provider>
      <HomePage />
    </Web3Provider>
  );
}
