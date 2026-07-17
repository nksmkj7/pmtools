import { Attachment, UploadAttachmentInput } from '../types/attachment.types';
import { CreateDocInput, CreateDocPageInput, Doc, DocContainer, DocPage, DocSummary, DocWithPages } from '../types/doc.types';
import {
  Board,
  CreateCommentInput,
  CreateTicketInput,
  Ticket,
  TicketComment,
  TicketContainer,
  TicketStatus,
  TicketWithComments,
  UpdateTicketInput,
} from '../types/ticket.types';
import { PMUser } from '../types/user.types';

export interface IPMToolProvider {
  readonly providerName: string;

  getTicket(ticketId: string): Promise<Ticket>;
  getTicketWithComments(ticketId: string): Promise<TicketWithComments>;
  getComments(ticketId: string): Promise<TicketComment[]>;
  addComment(ticketId: string, input: CreateCommentInput): Promise<TicketComment>;

  createTicket(input: CreateTicketInput): Promise<Ticket>;
  updateTicket(ticketId: string, input: UpdateTicketInput): Promise<Ticket>;
  deleteTicket(ticketId: string): Promise<void>;

  updateStatus(ticketId: string, status: string): Promise<Ticket>;
  getAvailableStatuses(ticketId: string): Promise<TicketStatus[]>;

  /** Projects (Jira) or lists (ClickUp) tickets can be created in — the values for `projectKeyOrListId`. */
  getContainers(): Promise<TicketContainer[]>;

  /** Visual boards over tickets — Jira Agile Scrum/Kanban boards, or ClickUp lists in board view. */
  getBoards(): Promise<Board[]>;

  /** Search assignable users by name/email — use to resolve an `id` for the `assignee` field. */
  getUsers(query?: string): Promise<PMUser[]>;

  /**
   * List tickets in a project (Jira) or list (ClickUp), optionally filtered by
   * status name and/or assignee (Jira account ID, or ClickUp numeric user ID
   * as a string — resolve via `getUsers` first). Results are ordered most
   * recently updated first.
   */
  searchTickets(projectKeyOrListId: string, status?: string, assignee?: string): Promise<Ticket[]>;

  /**
   * List tickets assigned to a user across the ENTIRE workspace, not scoped
   * to a single project/list — use for "what's assigned to me/user X"
   * requests where no specific project/list was named. Jira runs a
   * cross-project JQL search; ClickUp requires `containerId` (the workspace
   * ID from `getWorkspaces`) since its team-scoped task search is
   * workspace-bound.
   */
  searchTicketsAssignedToUser(assignee: string, containerId?: string): Promise<Ticket[]>;

  /** ClickUp-only: attach an existing task to an additional list without removing it from others. */
  addTaskToList?(ticketId: string, listId: string): Promise<Ticket>;
  /** ClickUp-only: detach a task from one of its additional lists. */
  removeTaskFromList?(ticketId: string, listId: string): Promise<void>;

  /**
   * Docs (ClickUp) / Confluence pages (Jira). Implemented separately per
   * provider since the underlying APIs shape docs very differently, but
   * both feed the same `getDocWithPages` composition below.
   *
   * `containerId` is the ClickUp workspaceId or the Confluence spaceKey.
   * ClickUp additionally requires it on `getDoc`/`getDocPages` since every
   * Docs v3 endpoint is scoped to a workspace.
   */
  searchDocs?(containerId: string): Promise<DocSummary[]>;
  getDoc?(docId: string, containerId?: string): Promise<Doc>;
  getDocPages?(docId: string, containerId?: string): Promise<DocPage[]>;

  /** ClickUp-only: list workspaces (teams) — the values for `containerId` on the doc routes above. */
  getWorkspaces?(): Promise<DocContainer[]>;

  /** Composes getDoc + getDocPages — implemented once in BasePMToolProvider. */
  getDocWithPages(docId: string, containerId?: string): Promise<DocWithPages>;

  /**
   * Creates a new Doc container (ClickUp) / top-level page (Confluence).
   * `containerId` is the ClickUp workspaceId or the Confluence spaceKey.
   */
  createDoc?(containerId: string, input: CreateDocInput): Promise<Doc>;
  /** Adds a page with content to an existing doc. ClickUp-only in the current implementation. */
  createDocPage?(docId: string, input: CreateDocPageInput, containerId?: string): Promise<DocPage>;

  /**
   * Composes createDoc + createDocPage — implemented once in
   * BasePMToolProvider. Creates the doc, then (if `content` is given) adds a
   * single page with that content, so callers can publish markdown content
   * as a new doc in one call instead of two.
   */
  createDocWithContent(
    containerId: string,
    input: CreateDocInput & { content?: string },
  ): Promise<DocWithPages>;

  /**
   * Uploads a file to a ticket, returning a durable URL (e.g. to then embed
   * as a markdown image in a doc page's content, since neither provider
   * exposes a doc/page-scoped upload route).
   */
  uploadAttachment?(ticketId: string, input: UploadAttachmentInput): Promise<Attachment>;

  /** ClickUp-only: overwrite an existing doc page's content. */
  updateDocPage?(
    docId: string,
    pageId: string,
    input: { content: string; name?: string },
    containerId?: string,
  ): Promise<DocPage>;
}
