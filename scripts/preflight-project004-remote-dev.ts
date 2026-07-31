import {
  renderRemoteDevPreflight,
  runRemoteDevPreflight,
} from "./project004-remote-dev-operations.ts";

const result = runRemoteDevPreflight();
process.stdout.write(renderRemoteDevPreflight(result));
if (!result.ok) process.exitCode = 1;
