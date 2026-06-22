// src/shared/constants/notification.constants.js

export const NOTIFICATION_TYPES = {
  // ─── Issue ──────────────────────────────────────────────
  ISSUE_ASSIGNED:        "ISSUE_ASSIGNED",
  ISSUE_UNASSIGNED:      "ISSUE_UNASSIGNED",
  ISSUE_STATUS_CHANGED:  "ISSUE_STATUS_CHANGED",
  ISSUE_COMMENT_ADDED:   "ISSUE_COMMENT_ADDED",
  ISSUE_DUE_SOON:        "ISSUE_DUE_SOON",

  // ─── Workspace ──────────────────────────────────────────
  WORKSPACE_MEMBER_ADDED:   "WORKSPACE_MEMBER_ADDED",
  WORKSPACE_MEMBER_REMOVED: "WORKSPACE_MEMBER_REMOVED",
  WORKSPACE_ROLE_CHANGED:   "WORKSPACE_ROLE_CHANGED",

  // ─── Project ────────────────────────────────────────────
  PROJECT_MEMBER_ADDED:   "PROJECT_MEMBER_ADDED",
  PROJECT_MEMBER_REMOVED: "PROJECT_MEMBER_REMOVED",

  // ─── Sprint ─────────────────────────────────────────────
  SPRINT_STARTED:   "SPRINT_STARTED",
  SPRINT_COMPLETED: "SPRINT_COMPLETED",
};

/**
 * Defines who gets notified for each event type.
 * Used by the notification service to determine recipients.
 */
export const NOTIFICATION_RECIPIENTS = {
  ISSUE_ASSIGNED:       "assignee",      // notify the assignee
  ISSUE_UNASSIGNED:     "assignee",      // notify the removed assignee
  ISSUE_STATUS_CHANGED: "reporter",      // notify the reporter
  ISSUE_COMMENT_ADDED:  "participants",  // notify assignees + reporter
  WORKSPACE_MEMBER_ADDED:   "target",   // notify the added member
  WORKSPACE_MEMBER_REMOVED: "target",   // notify the removed member
  PROJECT_MEMBER_ADDED:     "target",   // notify the added member
  SPRINT_STARTED:   "project_members",  // notify all project members
  SPRINT_COMPLETED: "project_members",  // notify all project members
};