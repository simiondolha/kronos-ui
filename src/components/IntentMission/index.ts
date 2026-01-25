// Intent-Based Mission Creator Components
// Mission 10: "Horizon Club" - Natural Language Mission Creation

export { IntentInput } from "./IntentInput";
export { ProposalPanel } from "./ProposalPanel";
export { MissionCreator } from "./MissionCreator";

// Types
export type {
  Proposal,
  ThreatSpec,
  AssetProposal,
  Objective,
} from "./ProposalPanel";

export type {
  IntentMissionState,
  IntentPayload,
  SubmitIntentPayload,
  ModifyIntentPayload,
  ConfirmProposalPayload,
  DenyProposalPayload,
  KillMissionPayload,
  ResumeMissionPayload,
  IntentParsedResponse,
  IntentErrorResponse,
  ClarificationRequestResponse,
  MissionStartedResponse,
} from "./MissionCreator";
