const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const distRoot = path.join(__dirname, "dist");
const outputPath = path.resolve(
  __dirname,
  "../../../outputs/void-shadow-workflow-3840x2160.png",
);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const pathname = requestUrl.pathname === "/" ? "/workflow.html" : requestUrl.pathname;
    const requestedPath = path.resolve(distRoot, `.${decodeURIComponent(pathname)}`);

    if (!requestedPath.startsWith(distRoot)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    const body = await fs.readFile(requestedPath);
    response.writeHead(200, {
      "content-type": mimeTypes[path.extname(requestedPath)] ?? "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

async function render() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  });
  const page = await browser.newPage({
    viewport: { width: 3840, height: 2160 },
    deviceScaleFactor: 1,
  });
  const browserErrors = [];

  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/workflow.html`, { waitUntil: "networkidle" });
  await page.screenshot({ path: outputPath, type: "png" });

  const modCount = await page.locator(".wf-mod-count").textContent();
  if (modCount?.trim() !== "18 installed") {
    throw new Error(`Expected 18 installed mods, received: ${modCount}`);
  }

  await page.getByRole("button", { name: "2", exact: true }).click();
  if (!(await page.getByText("Entity Culling", { exact: true }).isVisible())) {
    throw new Error("Installed mod pagination did not advance to page two.");
  }

  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Dock sidebar on the right" }).click();
  if ((await page.locator(".wf-client-shell").getAttribute("data-sidebar-dock")) !== "right") {
    throw new Error("Sidebar did not dock on the right.");
  }

  await page.getByRole("button", { name: "Accept & Prepare Client" }).click();
  if (!(await page.locator(".wf-loading-panel-active").isVisible())) {
    throw new Error("Installer did not activate the loading state.");
  }

  await page.getByRole("button", { name: "Open Eminence Protocol instance details" }).click();
  if (!(await page.getByRole("dialog", { name: "Eminence Protocol" }).isVisible())) {
    throw new Error("Instance detail dialog did not reopen.");
  }

  await browser.close();
  server.close();

  if (browserErrors.length > 0) {
    throw new Error(browserErrors.join("\n"));
  }

  process.stdout.write(`${outputPath}\n`);
}

render().catch((error) => {
  server.close();
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
