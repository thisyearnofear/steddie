export async function createSmartAccount(flowAddr: string): Promise<void> {
  if (!window.ethereum) throw new Error("Ethereum wallet not found");
  const [account] = await window.ethereum.request({ method: "eth_requestAccounts" });
  const message = `Memoree link:${flowAddr}`;
  // personal_sign expects hex data, but MetaMask accepts utf8 string as-is
  const signature = await window.ethereum.request({
    method: "personal_sign",
    params: [message, account]
  });
  const url = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/link-address`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flowAddress: flowAddr, signature })
  });
  if (!resp.ok) throw new Error("Link failed");
  const { txHash } = await resp.json();
  // Wait for mining (poll every 2s up to 30s)
  for (let i = 0; i < 15; ++i) {
    const check = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/tx-status?hash=${txHash}`);
    if (check.ok) {
      const { mined } = await check.json();
      if (mined) return;
    }
    await new Promise(res => setTimeout(res, 2000));
  }
  throw new Error("Transaction not mined in time");
}