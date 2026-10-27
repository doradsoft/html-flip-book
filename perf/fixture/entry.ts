import { registerScalingScenario } from "../scenarios/scaling.page";
import { registerTurnScenario } from "../scenarios/turn.page";
import { installInstrumentation } from "./instrumentation";

/**
 * Perf fixture entry (issue #289): installs instrumentation before any
 * scenario code runs, then registers the page-side scenario APIs the
 * driver calls. The variant under test is selected at build time through
 * the html-flip-book-vanilla / flipbook-styles / html-flip-book-react
 * aliases in vite.config.mts.
 */

installInstrumentation();
registerTurnScenario();
registerScalingScenario();
