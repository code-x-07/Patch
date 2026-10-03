import "../engine/demoBank";
import { misconceptions } from "../content/misconceptions";
import { questions } from "../content/questions";
import { DEMO_INFO, type CourseDef } from "../course";
import { makeFlow } from "./flow";
import { QUIZ } from "./script";

/** The bundled algebra course (answer key included: demo, Live Mode server and tests only). */
export const DEMO_COURSE: CourseDef = { ...DEMO_INFO, quiz: QUIZ, bank: { questions, misconceptions }, reserveRepair: false };

export const { initialState, reducer } = makeFlow(DEMO_COURSE);
