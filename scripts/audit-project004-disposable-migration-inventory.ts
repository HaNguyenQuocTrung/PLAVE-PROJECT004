// Compatibility entrypoint. The canonical implementation is the exact
// production workspace preparation smoke used to unlock the proof runner.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  renderDisposableMigrationWorkspaceSmoke,
  runDisposableMigrationWorkspaceSmoke,
} from "./smoke-project004-disposable-migration-workspace.ts";

export {
  renderDisposableMigrationWorkspaceSmoke,
  runDisposableMigrationWorkspaceSmoke,
};

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  const result = runDisposableMigrationWorkspaceSmoke();
  process.stdout.write(
    renderDisposableMigrationWorkspaceSmoke(result),
  );
  process.exitCode =
    result.rootFailureCode === "NONE" ? 0 : 1;
}
