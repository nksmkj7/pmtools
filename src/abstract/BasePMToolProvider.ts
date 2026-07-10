import axios, { AxiosInstance, AxiosRequestConfig, isAxiosError } from 'axios';
import { IPMToolProvider } from '../interfaces/IPMToolProvider';
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
import { PMToolError, TicketNotFoundError } from '../utils/errors';

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
        const message =
          (err.response?.data as { message?: string; errorMessages?: string[] } | undefined)?.message ??
          (err.response?.data as { errorMessages?: string[] } | undefined)?.errorMessages?.join(', ') ??
          err.message;
        throw new PMToolError(this.providerName, `${context.action} failed: ${message}`, status, err);
      }
      throw new PMToolError(this.providerName, `${context.action} failed: ${(err as Error).message}`, 500, err);
    }
  }
}
