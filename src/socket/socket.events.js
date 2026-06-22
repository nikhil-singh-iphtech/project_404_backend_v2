export const SOCKET_EVENTS = {
 
  CONNECT:    "connect",
  DISCONNECT: "disconnect",
  ERROR:      "error",


  JOIN_PROJECT:   "join:project",
  LEAVE_PROJECT:  "leave:project",
  JOIN_WORKSPACE: "join:workspace",


  ISSUE_CREATED:        "issue:created",
  ISSUE_UPDATED:        "issue:updated",
  ISSUE_DELETED:        "issue:deleted",
  ISSUE_STATUS_CHANGED: "issue:status_changed",


  BOARD_UPDATED: "board:updated",

  
  COMMENT_ADDED:   "comment:added",
  COMMENT_UPDATED: "comment:updated",
  COMMENT_DELETED: "comment:deleted",

 
  SPRINT_STARTED:   "sprint:started",
  SPRINT_COMPLETED: "sprint:completed",

 
  NOTIFICATION_NEW: "notification:new",
};