import { BasePMToolProvider } from '../abstract/BasePMToolProvider';
import { JiraConfig } from '../types/config.types';
import { Doc, DocPage, DocSummary } from '../types/doc.types';
import {
  Board,
  CreateCommentInput,
  CreateTicketInput,
  Ticket,
  TicketComment,
  TicketContainer,
  TicketStatus,
  UpdateTicketInput,
} from '../types/ticket.types';
import { PMUser } from '../types/user.types';
import { PMToolError } from '../utils/errors';

interface JiraAdfDoc {
  type: 'doc';
  version: 1;
  content: unknown[];
}

interface JiraIssueResponse {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: JiraAdfDoc | null;
    status: { id: string; name: string; statusCategory?: { key: string } };
    assignee?: { displayName: string } | null;
    reporter?: { displayName: string } | null;
    priority?: { name: string } | null;
    created?: string;
    updated?: string;
  };
}

interface JiraCommentResponse {
  id: string;
  author: { displayName: string };
  body: JiraAdfDoc;
  created: string;
  updated: string;
}

interface ConfluencePageResponse {
  id: string;
  title: string;
  body?: { storage?: { value: string } };
  version?: { when?: string };
  history?: { createdDate?: string };
  _links?: { webui?: string; base?: string };
}

interface ConfluenceContentSearchResponse {
  results: ConfluencePageResponse[];
}

export class JiraProvider extends BasePMToolProvider {
  readonly providerName = 'jira';

  constructor(config: JiraConfig) {
    super(config.baseUrl.replace(/\/+$/, ''), {
      auth: { username: config.email, password: config.apiToken },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
  }

  async getTicket(ticketId: string): Promise<Ticket> {
    return this.request(async () => {
      const { data } = await this.http.get<JiraIssueResponse>(`/rest/api/3/issue/${ticketId}`);
      return this.toTicket(data);
    }, { ticketId, action: 'getTicket' });
  }

  async getComments(ticketId: string): Promise<TicketComment[]> {
    return this.request(async () => {
      const { data } = await this.http.get<{ comments: JiraCommentResponse[] }>(
        `/rest/api/3/issue/${ticketId}/comment`,
      );
      return data.comments.map((c) => this.toComment(c));
    }, { ticketId, action: 'getComments' });
  }

  async addComment(ticketId: string, input: CreateCommentInput): Promise<TicketComment> {
    return this.request(async () => {
      const { data } = await this.http.post<JiraCommentResponse>(`/rest/api/3/issue/${ticketId}/comment`, {
        body: this.toAdf(input.body),
      });
      return this.toComment(data);
    }, { ticketId, action: 'addComment' });
  }

  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    return this.request(async () => {
      const { data } = await this.http.post<{ id: string; key: string }>('/rest/api/3/issue', {
        fields: {
          project: { key: input.projectKeyOrListId },
          summary: input.title,
          description: input.description ? this.toAdf(input.description) : undefined,
          issuetype: { name: (input.issueType as string) ?? (input.parentId ? 'Sub-task' : 'Task') },
          ...(input.parentId ? { parent: { key: input.parentId } } : {}),
          ...(input.assignee ? { assignee: { accountId: input.assignee } } : {}),
          ...(input.priority ? { priority: { name: input.priority } } : {}),
        },
      });
      return this.getTicket(data.key);
    }, { action: 'createTicket' });
  }

  async updateTicket(ticketId: string, input: UpdateTicketInput): Promise<Ticket> {
    return this.request(async () => {
      await this.http.put(`/rest/api/3/issue/${ticketId}`, {
        fields: {
          ...(input.title ? { summary: input.title } : {}),
          ...(input.description ? { description: this.toAdf(input.description) } : {}),
          ...(input.assignee ? { assignee: { accountId: input.assignee } } : {}),
          ...(input.priority ? { priority: { name: input.priority } } : {}),
        },
      });
      return this.getTicket(ticketId);
    }, { ticketId, action: 'updateTicket' });
  }

  async deleteTicket(ticketId: string): Promise<void> {
    return this.request(async () => {
      await this.http.delete(`/rest/api/3/issue/${ticketId}`);
    }, { ticketId, action: 'deleteTicket' });
  }

  async getAvailableStatuses(ticketId: string): Promise<TicketStatus[]> {
    return this.request(async () => {
      const { data } = await this.http.get<{ transitions: { id: string; name: string; to: { id: string; name: string } }[] }>(
        `/rest/api/3/issue/${ticketId}/transitions`,
      );
      return data.transitions.map((t) => ({ id: t.id, name: t.to.name }));
    }, { ticketId, action: 'getAvailableStatuses' });
  }

  async updateStatus(ticketId: string, status: string): Promise<Ticket> {
    return this.request(async () => {
      const transitions = await this.getAvailableStatuses(ticketId);
      const match = transitions.find(
        (t) => t.name.toLowerCase() === status.toLowerCase() || t.id === status,
      );
      if (!match) {
        throw new PMToolError(
          this.providerName,
          `No transition to status "${status}" available for ${ticketId}`,
          400,
        );
      }
      await this.http.post(`/rest/api/3/issue/${ticketId}/transitions`, {
        transition: { id: match.id },
      });
      return this.getTicket(ticketId);
    }, { ticketId, action: 'updateStatus' });
  }

  async getContainers(): Promise<TicketContainer[]> {
    return this.request(async () => {
      const containers: TicketContainer[] = [];
      let startAt = 0;
      let isLast = false;
      while (!isLast) {
        const { data } = await this.http.get<{
          values: { key: string; name: string }[];
          isLast: boolean;
          startAt: number;
          maxResults: number;
        }>('/rest/api/3/project/search', { params: { startAt, maxResults: 50 } });
        containers.push(...data.values.map((p) => ({ id: p.key, name: p.name })));
        isLast = data.isLast;
        startAt += data.maxResults;
      }
      return containers;
    }, { action: 'getContainers' });
  }

  async getBoards(): Promise<Board[]> {
    return this.request(async () => {
      const boards: Board[] = [];
      let startAt = 0;
      let isLast = false;
      while (!isLast) {
        const { data } = await this.http.get<{
          values: { id: number; name: string; type: string; location?: { projectKey?: string } }[];
          isLast: boolean;
          startAt: number;
          maxResults: number;
        }>('/rest/agile/1.0/board', { params: { startAt, maxResults: 50 } });
        boards.push(
          ...data.values.map((b) => ({
            id: String(b.id),
            name: b.name,
            type: b.type,
            projectKeyOrListId: b.location?.projectKey,
          })),
        );
        isLast = data.isLast;
        startAt += data.maxResults;
      }
      return boards;
    }, { action: 'getBoards' });
  }

  async getUsers(query?: string): Promise<PMUser[]> {
    return this.request(async () => {
      const { data } = await this.http.get<
        { accountId: string; displayName: string; emailAddress?: string }[]
      >('/rest/api/3/user/search', { params: { query: query ?? '', maxResults: 50 } });
      return data.map((u) => ({ id: u.accountId, name: u.displayName, email: u.emailAddress }));
    }, { action: 'getUsers' });
  }

  async searchTickets(projectKeyOrListId: string, status?: string): Promise<Ticket[]> {
    return this.request(async () => {
      const jql = status
        ? `project = "${projectKeyOrListId}" AND status = "${status}"`
        : `project = "${projectKeyOrListId}"`;
      const fields = 'summary,description,status,assignee,reporter,priority,created,updated';
      const tickets: Ticket[] = [];
      let nextPageToken: string | undefined;
      let isLast = false;
      while (!isLast) {
        const { data } = await this.http.get<{
          issues: JiraIssueResponse[];
          nextPageToken?: string;
          isLast: boolean;
        }>('/rest/api/3/search/jql', { params: { jql, fields, maxResults: 50, nextPageToken } });
        tickets.push(...data.issues.map((issue) => this.toTicket(issue)));
        isLast = data.isLast;
        nextPageToken = data.nextPageToken;
      }
      return tickets;
    }, { action: 'searchTickets' });
  }

  private toTicket(data: JiraIssueResponse): Ticket {
    return {
      id: data.id,
      key: data.key,
      title: data.fields.summary,
      description: this.fromAdf(data.fields.description),
      status: {
        id: data.fields.status.id,
        name: data.fields.status.name,
        category: data.fields.status.statusCategory?.key,
      },
      assignee: data.fields.assignee?.displayName,
      reporter: data.fields.reporter?.displayName,
      priority: data.fields.priority?.name,
      createdAt: data.fields.created,
      updatedAt: data.fields.updated,
      raw: data,
    };
  }

  private toComment(data: JiraCommentResponse): TicketComment {
    return {
      id: data.id,
      author: data.author.displayName,
      body: this.fromAdf(data.body),
      createdAt: data.created,
      updatedAt: data.updated,
    };
  }

  private toAdf(text: string): JiraAdfDoc {
    return {
      type: 'doc',
      version: 1,
      content: text.split('\n').map((line) => ({
        type: 'paragraph',
        content: line ? [{ type: 'text', text: line }] : [],
      })),
    };
  }

  private fromAdf(doc?: JiraAdfDoc | null): string {
    if (!doc?.content) return '';
    const extract = (nodes: unknown[]): string =>
      nodes
        .map((node) => {
          const n = node as { type?: string; text?: string; content?: unknown[] };
          if (n.type === 'text') return n.text ?? '';
          if (n.content) return extract(n.content);
          return '';
        })
        .join('');
    return doc.content
      .map((paragraph) => extract((paragraph as { content?: unknown[] }).content ?? []))
      .join('\n');
  }

  /** `containerId` is the Confluence space key. Confluence lives on the same Atlassian site as Jira, under /wiki. */
  async searchDocs(containerId: string): Promise<DocSummary[]> {
    return this.request(async () => {
      const { data } = await this.http.get<ConfluenceContentSearchResponse>('/wiki/rest/api/content', {
        params: { spaceKey: containerId, type: 'page', limit: 100, expand: 'version,history' },
      });
      return data.results.map((p) => this.toDoc(p));
    }, { action: 'searchDocs' });
  }

  async getDoc(docId: string): Promise<Doc> {
    return this.request(async () => {
      const { data } = await this.http.get<ConfluencePageResponse>(`/wiki/rest/api/content/${docId}`, {
        params: { expand: 'body.storage,version,history' },
      });
      return this.toDoc(data);
    }, { ticketId: docId, action: 'getDoc' });
  }

  async getDocPages(docId: string): Promise<DocPage[]> {
    return this.request(async () => {
      const { data } = await this.http.get<ConfluenceContentSearchResponse>(
        `/wiki/rest/api/content/${docId}/child/page`,
        { params: { expand: 'body.storage,version,history', limit: 100 } },
      );
      return data.results.map((p) => this.toDocPage(p));
    }, { ticketId: docId, action: 'getDocPages' });
  }

  private toDoc(data: ConfluencePageResponse): Doc {
    return {
      id: data.id,
      name: data.title,
      content: data.body?.storage?.value,
      url: data._links?.base && data._links?.webui ? `${data._links.base}${data._links.webui}` : undefined,
      createdAt: data.history?.createdDate,
      updatedAt: data.version?.when,
      raw: data,
    };
  }

  private toDocPage(data: ConfluencePageResponse): DocPage {
    return {
      id: data.id,
      title: data.title,
      content: data.body?.storage?.value ?? '',
      url: data._links?.base && data._links?.webui ? `${data._links.base}${data._links.webui}` : undefined,
      createdAt: data.history?.createdDate,
      updatedAt: data.version?.when,
      raw: data,
    };
  }
}
