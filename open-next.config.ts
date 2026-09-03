// Spike only (tuggi-app#686). Minimal config per opennext.js.org/cloudflare —
// no R2 incremental cache binding, since ISR/ cache strategy is explicitly
// out of scope for this spike (card #686, "Fora de escopo").
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
