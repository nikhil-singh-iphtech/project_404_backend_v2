

export const ISSUE_TYPES = {
  EPIC:    "EPIC",
  STORY:   "STORY",
  TASK:    "TASK",
  BUG:     "BUG",
  SUBTASK: "SUBTASK",
};

export const ISSUE_STATUSES = {
  TODO:        "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  IN_REVIEW:   "IN_REVIEW",
  DONE:        "DONE",
};

export const ISSUE_PRIORITIES = {
  CRITICAL: "CRITICAL",
  HIGH:     "HIGH",
  MEDIUM:   "MEDIUM",
  LOW:      "LOW",
  NONE:     "NONE",
};

/**
 * Defines valid parent-child relationships between issue types.
 *
 * Key   = child type
 * Value = allowed parent types
 *
 * Rules:
 * - EPIC has no parent
 * - STORY must belong to an EPIC
 * - TASK and BUG can be standalone or under an EPIC
 * - SUBTASK can belong to STORY, TASK, or BUG — never to EPIC or SUBTASK
 */
export const VALID_PARENT_TYPES = {
  [ISSUE_TYPES.STORY]:   [ISSUE_TYPES.EPIC],
  [ISSUE_TYPES.TASK]:    [ISSUE_TYPES.EPIC],
  [ISSUE_TYPES.BUG]:     [ISSUE_TYPES.EPIC],
  [ISSUE_TYPES.SUBTASK]: [
    ISSUE_TYPES.STORY,
    ISSUE_TYPES.TASK,
    ISSUE_TYPES.BUG,
  ],
};

/**
 * Valid status transitions.
 * Key   = current status
 * Value = allowed next statuses
 */
export const VALID_STATUS_TRANSITIONS = {
  [ISSUE_STATUSES.TODO]:        [ISSUE_STATUSES.IN_PROGRESS],
  [ISSUE_STATUSES.IN_PROGRESS]: [ISSUE_STATUSES.IN_REVIEW, ISSUE_STATUSES.TODO],
  [ISSUE_STATUSES.IN_REVIEW]:   [ISSUE_STATUSES.DONE, ISSUE_STATUSES.IN_PROGRESS],
  [ISSUE_STATUSES.DONE]:        [ISSUE_STATUSES.TODO],
};

export const REQUIRES_PARENT = [
  ISSUE_TYPES.SUBTASK,  // only subtask strictly requires a parent
];