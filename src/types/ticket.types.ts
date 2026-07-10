export type PMProvider = 'jira' | 'clickup';

export interface TicketComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TicketStatus {
  id: string;
  name: string;
  category?: string;
}

export interface Ticket {
  id: string;
  key: string;
  title: string;
  description: string;
  status: TicketStatus;
  assignee?: string;
  reporter?: string;
  priority?: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
  raw?: unknown;
}

export interface TicketWithComments extends Ticket {
  comments: TicketComment[];
}

/**
 * Where a ticket can be created — a Jira project or a ClickUp list.
 * `id` is what callers pass back as `projectKeyOrListId` when creating a ticket.
 */
export interface TicketContainer {
  id: string;
  name: string;
  path?: string;
}

/**
 * A visual board over tickets — a Jira Agile (Scrum/Kanban) board, or a
 * ClickUp list viewed in board mode (ClickUp has no separate board entity;
 * every list can be viewed as a board, so ClickUp boards and containers
 * share the same `id`).
 */
export interface Board {
  id: string;
  name: string;
  type?: string;
  projectKeyOrListId?: string;
  path?: string;
}

export interface CreateTicketInput {
  title: string;
  description?: string;
  projectKeyOrListId: string;
  assignee?: string;
  priority?: string;
  status?: string;
  /** Parent ticket key/id — set to create this ticket as a subtask of that parent. */
  parentId?: string;
  [key: string]: unknown;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  assignee?: string;
  priority?: string;
  [key: string]: unknown;
}

export interface CreateCommentInput {
  body: string;
  author?: string;
}
