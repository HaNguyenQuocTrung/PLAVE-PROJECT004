import { withLocalInstalledChrome } from "./local-installed-chrome.ts";
import { createServer } from "node:http";

const server = createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end("<!doctype html><main id='result'>before</main><script>document.querySelector('#result').textContent='javascript-pass';console.log('PLAVE_BROWSER_CONSOLE_PASS')</script>");
});
await new Promise<void>((resolvePromise, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => resolvePromise());
});
const address = server.address();
if (!address || typeof address === "string" || address.port === 3000) throw new Error("PLAVE_BROWSER_SMOKE_PORT_INVALID");

try {
await withLocalInstalledChrome(async (chrome) => {
  const page = await chrome.newPage();
  const consoleMessages: string[] = [];
  const requests: string[] = [];
  page.cdp.on("Runtime.consoleAPICalled", (params) => {
    const args = Array.isArray(params.args) ? params.args : [];
    consoleMessages.push(args.map((entry) => String((entry as { value?: unknown }).value ?? "")).join(" "));
  });
  page.cdp.on("Network.requestWillBeSent", (params) => {
    const request = params.request as { url?: unknown } | undefined;
    if (typeof request?.url === "string") requests.push(request.url);
  });
  const url = `http://127.0.0.1:${String(address.port)}/smoke`;
  await page.navigate(url);
  const result = await page.evaluate<string>("document.querySelector('#result')?.textContent ?? ''");
  const screenshot = await page.screenshot();
  if (result !== "javascript-pass") throw new Error("PLAVE_BROWSER_SMOKE_JAVASCRIPT_FAILED");
  if (!consoleMessages.includes("PLAVE_BROWSER_CONSOLE_PASS")) throw new Error("PLAVE_BROWSER_SMOKE_CONSOLE_FAILED");
  if (!requests.some((request) => request === url)) throw new Error("PLAVE_BROWSER_SMOKE_NETWORK_EVENTS_FAILED");
  if (screenshot.length < 100 || screenshot.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("PLAVE_BROWSER_SMOKE_SCREENSHOT_FAILED");
  }
  process.stdout.write(`PLAVE_LOCAL_BROWSER=${chrome.executable}\n`);
  process.stdout.write("PLAVE_BROWSER_LAUNCH_NAVIGATE_JAVASCRIPT_SCREENSHOT_CONSOLE_NETWORK=PASS\n");
});
} finally {
  await new Promise<void>((resolvePromise, reject) => server.close((error) => error ? reject(error) : resolvePromise()));
}
