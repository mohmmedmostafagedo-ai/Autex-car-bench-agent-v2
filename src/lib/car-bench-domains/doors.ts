import { type CarBenchAgentInput, type CarBenchAgentDecision, type CarBenchDomainModule } from './shared';

/**
 * IMPORTANT -- read before enabling this domain for real evaluation.
 *
 * This module intentionally does NOT call any door/lock tool yet. CAR-bench's
 * real tool schema for door/lock control (exact tool name(s), parameter
 * names, and expected values -- e.g. is it one `lock_unlock_doors(locked:
 * bool)` call, or per-door calls, or an `open_close_door(door, percentage)`
 * shape like the sunroof tools?) is defined in
 * third_party/car-bench/car_bench/envs/car_voice_assistant/ in the
 * organizers' repo, which is not available in this codebase. Guessing tool
 * names/arguments here would reproduce the exact failure that got this
 * submission rejected: get_weather being called with a fabricated
 * argument the real environment didn't recognize.
 *
 * To finish this domain correctly:
 *   1. In your car-bench-ijcai checkout, find the real tool name(s):
 *        grep -rn "door" third_party/car-bench/car_bench/envs/car_voice_assistant/ \
 *          --include="*.py" -l
 *   2. Open the matching file and note the exact function name, parameter
 *      names, and parameter types/enums it expects.
 *   3. Replace DOOR_TOOL_NAME / buildDoorToolCall below with the confirmed
 *      values, following the same pattern as sunroof.ts's
 *      canCallSunroof()/buildWeatherCheckCall().
 *   4. Add a regression test in tests/ mirroring the sunroof tests, using
 *      the confirmed schema (not an assumed one).
 *
 * Until that's done, this domain matches door/lock intent (so the request
 * doesn't fall through to the generic "clearer vehicle-control request"
 * message, which was misleading -- the agent DID understand the request,
 * it just isn't wired to a verified tool yet) and returns an honest
 * refuse_or_defer instead of a fabricated tool call.
 */

const DOOR_TOOL_NAME: string | null = null; // set once confirmed against the real schema

function includesDoorIntent(message: string) {
  return /\bdoor(s)?\b|\block(s|ed|ing)?\b|\bunlock/i.test(message);
}

function decide(input: CarBenchAgentInput): CarBenchAgentDecision {
  if (DOOR_TOOL_NAME === null) {
    return {
      action: 'refuse_or_defer',
      toolCalls: [],
      message: 'I understand you want to control the doors, but I do not yet have a verified tool for that action, so I will not guess.',
      reliabilityNotes: [
        'Door/lock intent recognized, but no confirmed CAR-bench tool schema is wired in yet.',
        'Avoided fabricating a tool name/arguments for an unverified capability.',
      ],
    };
  }

  // Placeholder for once DOOR_TOOL_NAME and its real parameters are confirmed.
  return {
    action: 'refuse_or_defer',
    toolCalls: [],
    message: 'Door control is not yet implemented.',
    reliabilityNotes: ['decide() needs to be completed once the real tool schema is confirmed.'],
  };
}

export const doorsDomain: CarBenchDomainModule = {
  name: 'doors',
  matchesIntent: includesDoorIntent,
  decide,
};
