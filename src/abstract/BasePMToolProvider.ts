import axios, { AxiosInstance, AxiosRequestConfig, isAxiosError } from 'axios';
import { IPMToolProvider } from '../interfaces/IPMToolProvider';
import { Attachment, UploadAttachmentInput } from '../types/attachment.types';
import { CreateDocInput, CreateDocPageInput, Doc, DocPage, DocWithPages } from '../types/doc.types';
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
import { FeatureNotSupportedError, PMToolError, TicketNotFoundError } from '../utils/errors';

/**
 * Shared behavior for every PM tool integration: HTTP client construction,
 * uniform error translation, and the getTicketWithComments composition that
 * every provider would otherwise duplicate. Provider-specific request/response
 * shaping is left to subclasses via the protected abstract hooks.
 */
export abstract class BasePMToolProvider implements IPMToolProvider {
  abstract readonly providerName: string;
  protected readonly http: AxiosInstance;

  protected constructor(baseURL: string, config: AxiosRequestConfig = {}) {
    this.http = axios.create({
      baseURL,
      timeout: 15_000,
      ...config,
    });
  }

  async getTicketWithComments(ticketId: string): Promise<TicketWithComments> {
    const [ticket, comments] = await Promise.all([
      this.getTicket(ticketId),
      this.getComments(ticketId),
    ]);
    return { ...ticket, comments };
  }

  abstract getTicket(ticketId: string): Promise<Ticket>;
  abstract getComments(ticketId: string): Promise<TicketComment[]>;
  abstract addComment(ticketId: string, input: CreateCommentInput): Promise<TicketComment>;
  abstract createTicket(input: CreateTicketInput): Promise<Ticket>;
  abstract updateTicket(ticketId: string, input: UpdateTicketInput): Promise<Ticket>;
  abstract deleteTicket(ticketId: string): Promise<void>;
  abstract updateStatus(ticketId: string, status: string): Promise<Ticket>;
  abstract getAvailableStatuses(ticketId: string): Promise<TicketStatus[]>;
  abstract getContainers(): Promise<TicketContainer[]>;
  abstract getBoards(): Promise<Board[]>;
  abstract getUsers(query?: string): Promise<PMUser[]>;
  abstract searchTickets(projectKeyOrListId: string, status?: string, assignee?: string): Promise<Ticket[]>;
  abstract searchTicketsAssignedToUser(assignee: string, containerId?: string): Promise<Ticket[]>;

  // Declared here (not abstract) so `this.getDoc`/`this.getDocPages` type-check
  // in getDocWithPages below; subclasses that support docs override them.
  getDoc?(docId: string, containerId?: string): Promise<Doc>;
  getDocPages?(docId: string, containerId?: string): Promise<DocPage[]>;
  createDoc?(containerId: string, input: CreateDocInput): Promise<Doc>;
  createDocPage?(docId: string, input: CreateDocPageInput, containerId?: string): Promise<DocPage>;
  uploadAttachment?(ticketId: string, input: UploadAttachmentInput): Promise<Attachment>;
  updateDocPage?(
    docId: string,
    pageId: string,
    input: { content: string; name?: string },
    containerId?: string,
  ): Promise<DocPage>;

  /**
   * Shared across providers: fetches a doc/page and its pages in parallel,
   * same composition shape as getTicketWithComments. Providers only need to
   * implement getDoc/getDocPages (or neither, if they don't support docs).
   */
  async getDocWithPages(docId: string, containerId?: string): Promise<DocWithPages> {
    if (!this.getDoc || !this.getDocPages) {
      throw new FeatureNotSupportedError(this.providerName, 'getDocWithPages');
    }
    const [doc, pages] = await Promise.all([
      this.getDoc(docId, containerId),
      this.getDocPages(docId, containerId),
    ]);
    return { ...doc, pages };
  }

  /**
   * Shared across providers: creates the doc, then (if content is given)
   * adds a single page with that content — one call to publish markdown
   * content as a brand-new doc, instead of createDoc + createDocPage.
   */
  async createDocWithContent(
    containerId: string,
    input: CreateDocInput & { content?: string },
  ): Promise<DocWithPages> {
    if (!this.createDoc) {
      throw new FeatureNotSupportedError(this.providerName, 'createDocWithContent');
    }
    const doc = await this.createDoc(containerId, { name: input.name });
    if (!input.content) {
      return { ...doc, pages: [] };
    }
    if (!this.createDocPage) {
      throw new FeatureNotSupportedError(this.providerName, 'createDocPage');
    }
    const page = await this.createDocPage(doc.id, { name: input.name, content: input.content }, containerId);
    return { ...doc, pages: [page] };
  }

  /**
   * Wraps a provider call so any Axios failure surfaces as a PMToolError
   * (or TicketNotFoundError for 404s) instead of a raw Axios exception,
   * so controllers never need to know which SDK/provider raised the error.
   */
  protected async request<T>(fn: () => Promise<T>, context: { ticketId?: string; action: string }): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status ?? 500;
        if (status === 404 && context.ticketId) {
          throw new TicketNotFoundError(this.providerName, context.ticketId);
        }
        const data = err.response?.data as
          | { message?: string; errorMessages?: string[]; errors?: Record<string, string> }
          | undefined;
        const message =
          data?.message ||
          data?.errorMessages?.join(', ') ||
          (data?.errors && Object.keys(data.errors).length ? JSON.stringify(data.errors) : undefined) ||
          err.message;
        throw new PMToolError(this.providerName, `${context.action} failed: ${message}`, status, err);
      }
      throw new PMToolError(this.providerName, `${context.action} failed: ${(err as Error).message}`, 500, err);
    }
  }
}
