import { BasePMToolProvider } from '../abstract/BasePMToolProvider';
import { Attachment, UploadAttachmentInput } from '../types/attachment.types';
import { ClickUpConfig } from '../types/config.types';
import { CreateDocInput, CreateDocPageInput, Doc, DocContainer, DocPage, DocSummary } from '../types/doc.types';
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

interface ClickUpTaskResponse {
  id: string;
  custom_id?: string | null;
  name: string;
  description?: string;
  text_content?: string;
  status: { id?: string; status: string; type?: string };
  assignees?: { username: string }[];
  priority?: { priority: string } | null;
  url: string;
  date_created?: string;
  date_updated?: string;
  list: { id: string };
}

interface ClickUpCommentResponse {
  id: string;
  comment_text: string;
  user: { username: string };
  date: string;
}

interface ClickUpListResponse {
  statuses: { id: string; status: string; type: string }[];
}

interface ClickUpTeamResponse {
  teams: {
    id: string;
    name: string;
    members?: { user: { id: number; username: string; email?: string } }[];
  }[];
}

interface ClickUpSpaceResponse {
  spaces: { id: string; name: string }[];
}

interface ClickUpFolderResponse {
  folders: { id: string; name: string; lists: { id: string; name: string }[] }[];
}

interface ClickUpFolderlessListResponse {
  lists: { id: string; name: string }[];
}

interface ClickUpDocResponse {
  id: string;
  name: string;
  date_created?: string;
  date_updated?: string;
}

interface ClickUpDocPageResponse {
  id: string;
  name: string;
  content?: string;
  date_created?: string;
  date_updated?: string;
}

interface ClickUpAttachmentResponse {
  id: string;
  url: string;
}

export class ClickUpProvider extends BasePMToolProvider {
  readonly providerName = 'clickup';

  constructor(config: ClickUpConfig) {
    super(config.baseUrl.replace(/\/+$/, ''), {
      headers: { Authorization: config.apiToken, 'Content-Type': 'application/json' },
    });
  }

  async getTicket(ticketId: string): Promise<Ticket> {
    return this.request(async () => {
      const { data } = await this.http.get<ClickUpTaskResponse>(`/api/v2/task/${ticketId}`);
      return this.toTicket(data);
    }, { ticketId, action: 'getTicket' });
  }

  async getComments(ticketId: string): Promise<TicketComment[]> {
    return this.request(async () => {
      const { data } = await this.http.get<{ comments: ClickUpCommentResponse[] }>(
        `/api/v2/task/${ticketId}/comment`,
      );
      return data.comments.map((c) => this.toComment(c));
    }, { ticketId, action: 'getComments' });
  }

  async addComment(ticketId: string, input: CreateCommentInput): Promise<TicketComment> {
    return this.request(async () => {
      const { data } = await this.http.post<ClickUpCommentResponse>(`/api/v2/task/${ticketId}/comment`, {
        comment_text: input.body,
      });
      return this.toComment(data);
    }, { ticketId, action: 'addComment' });
  }

  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    return this.request(async () => {
      const { data } = await this.http.post<ClickUpTaskResponse>(
        `/api/v2/list/${input.projectKeyOrListId}/task`,
        {
          name: input.title,
          description: input.description,
          ...(input.status ? { status: input.status } : {}),
          ...(input.priority ? { priority: input.priority } : {}),
          ...(input.parentId ? { parent: input.parentId } : {}),
          ...(input.assignee ? { assignees: [Number(input.assignee)] } : {}),
        },
      );
      return this.toTicket(data);
    }, { action: 'createTicket' });
  }

  async updateTicket(ticketId: string, input: UpdateTicketInput): Promise<Ticket> {
    return this.request(async () => {
      const { data } = await this.http.put<ClickUpTaskResponse>(`/api/v2/task/${ticketId}`, {
        ...(input.title ? { name: input.title } : {}),
        ...(input.description ? { description: input.description } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.assignee ? { assignees: { add: [Number(input.assignee)], rem: [] } } : {}),
      });
      return this.toTicket(data);
    }, { ticketId, action: 'updateTicket' });
  }

  async deleteTicket(ticketId: string): Promise<void> {
    return this.request(async () => {
      await this.http.delete(`/api/v2/task/${ticketId}`);
    }, { ticketId, action: 'deleteTicket' });
  }

  async getAvailableStatuses(ticketId: string): Promise<TicketStatus[]> {
    return this.request(async () => {
      const { data: task } = await this.http.get<ClickUpTaskResponse>(`/api/v2/task/${ticketId}`);
      const { data: list } = await this.http.get<ClickUpListResponse>(`/api/v2/list/${task.list.id}`);
      return list.statuses.map((s) => ({ id: s.id, name: s.status, category: s.type }));
    }, { ticketId, action: 'getAvailableStatuses' });
  }

  async updateStatus(ticketId: string, status: string): Promise<Ticket> {
    return this.request(async () => {
      const statuses = await this.getAvailableStatuses(ticketId);
      const match = statuses.find((s) => s.name.toLowerCase() === status.toLowerCase() || s.id === status);
      if (!match) {
        throw new PMToolError(
          this.providerName,
          `No status "${status}" available for ${ticketId}`,
          400,
        );
      }
      const { data } = await this.http.put<ClickUpTaskResponse>(`/api/v2/task/${ticketId}`, {
        status: match.name,
      });
      return this.toTicket(data);
    }, { ticketId, action: 'updateStatus' });
  }

  async getContainers(): Promise<TicketContainer[]> {
    return this.request(async () => {
      const { data: teamData } = await this.http.get<ClickUpTeamResponse>('/api/v2/team');
      const containers: TicketContainer[] = [];

      for (const team of teamData.teams) {
        const { data: spaceData } = await this.http.get<ClickUpSpaceResponse>(
          `/api/v2/team/${team.id}/space`,
          { params: { archived: false } },
        );

        for (const space of spaceData.spaces) {
          const [{ data: folderData }, { data: folderlessData }] = await Promise.all([
            this.http.get<ClickUpFolderResponse>(`/api/v2/space/${space.id}/folder`, {
              params: { archived: false },
            }),
            this.http.get<ClickUpFolderlessListResponse>(`/api/v2/space/${space.id}/list`, {
              params: { archived: false },
            }),
          ]);

          for (const folder of folderData.folders) {
            for (const list of folder.lists) {
              containers.push({ id: list.id, name: list.name, path: `${space.name} / ${folder.name}` });
            }
          }
          for (const list of folderlessData.lists) {
            containers.push({ id: list.id, name: list.name, path: space.name });
          }
        }
      }

      return containers;
    }, { action: 'getContainers' });
  }

  async getBoards(): Promise<Board[]> {
    // ClickUp has no separate board entity — every list can be viewed as a board,
    // so a list's containers entry doubles as its board entry.
    const containers = await this.getContainers();
    return containers.map((c) => ({
      id: c.id,
      name: c.name,
      type: 'list',
      projectKeyOrListId: c.id,
      path: c.path,
    }));
  }

  async getUsers(query?: string): Promise<PMUser[]> {
    return this.request(async () => {
      const { data } = await this.http.get<ClickUpTeamResponse>('/api/v2/team');
      const users = data.teams.flatMap((t) =>
        (t.members ?? []).map((m) => ({
          id: String(m.user.id),
          name: m.user.username,
          email: m.user.email,
        })),
      );
      const q = query?.toLowerCase();
      return q
        ? users.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
        : users;
    }, { action: 'getUsers' });
  }

  async addTaskToList(ticketId: string, listId: string): Promise<Ticket> {
    return this.request(async () => {
      await this.http.post(`/api/v2/list/${listId}/task/${ticketId}`);
      const { data } = await this.http.get<ClickUpTaskResponse>(`/api/v2/task/${ticketId}`);
      return this.toTicket(data);
    }, { ticketId, action: 'addTaskToList' });
  }

  async removeTaskFromList(ticketId: string, listId: string): Promise<void> {
    return this.request(async () => {
      await this.http.delete(`/api/v2/list/${listId}/task/${ticketId}`);
    }, { ticketId, action: 'removeTaskFromList' });
  }

  async searchTickets(projectKeyOrListId: string, status?: string, assignee?: string): Promise<Ticket[]> {
    return this.request(async () => {
      const { data } = await this.http.get<{ tasks: ClickUpTaskResponse[] }>(
        `/api/v2/list/${projectKeyOrListId}/task`,
        {
          params: {
            archived: false,
            order_by: 'updated',
            reverse: true,
            ...(status ? { 'statuses[]': status } : {}),
            ...(assignee ? { 'assignees[]': assignee } : {}),
          },
        },
      );
      return data.tasks.map((t) => this.toTicket(t));
    }, { action: 'searchTickets' });
  }

  async searchTicketsAssignedToUser(assignee: string, containerId?: string): Promise<Ticket[]> {
    if (!containerId) {
      throw new PMToolError(
        this.providerName,
        'searchTicketsAssignedToUser requires the workspace (team) ID as containerId — resolve via getWorkspaces',
        400,
      );
    }
    return this.request(async () => {
      const tickets: Ticket[] = [];
      let page = 0;
      let lastPage = false;
      while (!lastPage) {
        const { data } = await this.http.get<{ tasks: ClickUpTaskResponse[]; last_page: boolean }>(
          `/api/v2/team/${containerId}/task`,
          {
            params: {
              archived: false,
              order_by: 'updated',
              reverse: true,
              'assignees[]': assignee,
              page,
            },
          },
        );
        tickets.push(...data.tasks.map((t) => this.toTicket(t)));
        lastPage = data.last_page;
        page += 1;
      }
      return tickets;
    }, { action: 'searchTicketsAssignedToUser' });
  }

  private toTicket(data: ClickUpTaskResponse): Ticket {
    return {
      id: data.id,
      key: data.custom_id ?? data.id,
      title: data.name,
      description: data.text_content ?? data.description ?? '',
      status: { id: data.status.id ?? data.status.status, name: data.status.status, category: data.status.type },
      assignee: data.assignees?.map((a) => a.username).join(', '),
      priority: data.priority?.priority,
      url: data.url,
      createdAt: data.date_created,
      updatedAt: data.date_updated,
      raw: data,
    };
  }

  private toComment(data: ClickUpCommentResponse): TicketComment {
    return {
      id: data.id,
      author: data.user.username,
      body: data.comment_text,
      createdAt: data.date,
    };
  }

  async getWorkspaces(): Promise<DocContainer[]> {
    return this.request(async () => {
      const { data } = await this.http.get<ClickUpTeamResponse>('/api/v2/team');
      return data.teams.map((t) => ({ id: t.id, name: t.name }));
    }, { action: 'getWorkspaces' });
  }

  /** `containerId` is the ClickUp workspaceId — every Docs v3 endpoint is scoped to a workspace. */
  async searchDocs(containerId: string): Promise<DocSummary[]> {
    return this.request(async () => {
      const { data } = await this.http.get<{ docs: ClickUpDocResponse[] }>(
        `/api/v3/workspaces/${containerId}/docs`,
      );
      return data.docs.map((d) => this.toDocSummary(d));
    }, { action: 'searchDocs' });
  }

  async getDoc(docId: string, containerId?: string): Promise<Doc> {
    if (!containerId) {
      throw new PMToolError(this.providerName, 'getDoc requires the workspaceId as containerId', 400);
    }
    return this.request(async () => {
      const { data } = await this.http.get<ClickUpDocResponse>(
        `/api/v3/workspaces/${containerId}/docs/${docId}`,
      );
      return this.toDocSummary(data);
    }, { ticketId: docId, action: 'getDoc' });
  }

  async getDocPages(docId: string, containerId?: string): Promise<DocPage[]> {
    if (!containerId) {
      throw new PMToolError(this.providerName, 'getDocPages requires the workspaceId as containerId', 400);
    }
    return this.request(async () => {
      const { data } = await this.http.get<ClickUpDocPageResponse[]>(
        `/api/v3/workspaces/${containerId}/docs/${docId}/pages`,
        { params: { content_format: 'text/md' } },
      );
      return data.map((p) => this.toDocPage(p));
    }, { ticketId: docId, action: 'getDocPages' });
  }

  async createDoc(containerId: string, input: CreateDocInput): Promise<Doc> {
    return this.request(async () => {
      const { data } = await this.http.post<ClickUpDocResponse>(
        `/api/v3/workspaces/${containerId}/docs`,
        { name: input.name },
      );
      return this.toDocSummary(data);
    }, { action: 'createDoc' });
  }

  async createDocPage(docId: string, input: CreateDocPageInput, containerId?: string): Promise<DocPage> {
    if (!containerId) {
      throw new PMToolError(this.providerName, 'createDocPage requires the workspaceId as containerId', 400);
    }
    return this.request(async () => {
      const { data } = await this.http.post<ClickUpDocPageResponse>(
        `/api/v3/workspaces/${containerId}/docs/${docId}/pages`,
        {
          name: input.name,
          content: input.content,
          content_format: input.contentFormat ?? 'text/md',
        },
      );
      return this.toDocPage(data);
    }, { ticketId: docId, action: 'createDocPage' });
  }

  async updateDocPage(
    docId: string,
    pageId: string,
    input: { content: string; name?: string },
    containerId?: string,
  ): Promise<DocPage> {
    if (!containerId) {
      throw new PMToolError(this.providerName, 'updateDocPage requires the workspaceId as containerId', 400);
    }
    return this.request(async () => {
      await this.http.put(
        `/api/v3/workspaces/${containerId}/docs/${docId}/pages/${pageId}`,
        {
          content: input.content,
          content_edit_mode: 'replace',
          ...(input.name ? { name: input.name } : {}),
        },
      );
      const { data } = await this.http.get<ClickUpDocPageResponse>(
        `/api/v3/workspaces/${containerId}/docs/${docId}/pages/${pageId}`,
        { params: { content_format: 'text/md' } },
      );
      return this.toDocPage(data);
    }, { ticketId: pageId, action: 'updateDocPage' });
  }

  /**
   * ClickUp's Docs v3 API has no doc/page-scoped file upload, so this reuses
   * the v2 task-attachment endpoint to get a durable CDN URL — the only way
   * to embed a real image in a doc page's markdown content.
   */
  async uploadAttachment(ticketId: string, input: UploadAttachmentInput): Promise<Attachment> {
    return this.request(async () => {
      const bytes = Buffer.from(input.contentBase64, 'base64');
      const form = new FormData();
      form.append('attachment', new Blob([bytes], { type: input.mimeType }), input.filename);

      const authHeader = this.http.defaults.headers.Authorization as string;
      const response = await fetch(`${this.http.defaults.baseURL}/api/v2/task/${ticketId}/attachment`, {
        method: 'POST',
        headers: { Authorization: authHeader },
        body: form,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new PMToolError(this.providerName, `uploadAttachment failed: ${text}`, response.status);
      }
      const data = (await response.json()) as ClickUpAttachmentResponse;
      return { id: data.id, url: data.url };
    }, { ticketId, action: 'uploadAttachment' });
  }

  private toDocSummary(data: ClickUpDocResponse): Doc {
    return {
      id: data.id,
      name: data.name,
      createdAt: data.date_created,
      updatedAt: data.date_updated,
    };
  }

  private toDocPage(data: ClickUpDocPageResponse): DocPage {
    return {
      id: data.id,
      title: data.name,
      content: data.content ?? '',
      createdAt: data.date_created,
      updatedAt: data.date_updated,
      raw: data,
    };
  }
}
