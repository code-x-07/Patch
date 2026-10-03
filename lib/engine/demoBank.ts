import { misconceptions } from "../content/misconceptions";
import { questions } from "../content/questions";
import { registerDefaultBank } from "./bank";

// Side-effect module: makes the bundled algebra content the engine's default.
// Only the demo, the Live Mode server and tests import this (via the engine index).
registerDefaultBank({ questions, misconceptions });
