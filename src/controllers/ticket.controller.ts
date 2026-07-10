import { NextFunction, Request, Response } from 'express';
import { PMToolProviderFactory } from '../factory/PMToolProviderFactory';
import { PMProvider } from '../types/ticket.types';
import { FeatureNotSupportedError } from '../utils/errors';

function getProvider(req: Request) {
  return PMToolProviderFactory.get(req.params.provider as PMProvider);
}

export const ticketController = {
  async getTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await getProvider(req).getTicket(req.params.ticketId);
      res.json(ticket);
    } catch (err) {
      next(err);
    }
  },

  async getTicketWithComments(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await getProvider(req).getTicketWithComments(req.params.ticketId);
      res.json(ticket);
    } catch (err) {
      next(err);
    }
  },

  async getComments(req: Request, res: Response, next: NextFunction) {
    try {
      const comments = await getProvider(req).getComments(req.params.ticketId);
      res.json(comments);
    } catch (err) {
      next(err);
    }
  },

  async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const comment = await getProvider(req).addComment(req.params.ticketId, req.body);
      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  },

  async createTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await getProvider(req).createTicket(req.body);
      res.status(201).json(ticket);
    } catch (err) {
      next(err);
    }
  },

  async updateTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await getProvider(req).updateTicket(req.params.ticketId, req.body);
      res.json(ticket);
    } catch (err) {
      next(err);
    }
  },

  async deleteTicket(req: Request, res: Response, next: NextFunction) {
    try {
      await getProvider(req).deleteTicket(req.params.ticketId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async getAvailableStatuses(req: Request, res: Response, next: NextFunction) {
    try {
      const statuses = await getProvider(req).getAvailableStatuses(req.params.ticketId);
      res.json(statuses);
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await getProvider(req).updateStatus(req.params.ticketId, req.body.status);
      res.json(ticket);
    } catch (err) {
      next(err);
    }
  },

  async getContainers(req: Request, res: Response, next: NextFunction) {
    try {
      const containers = await getProvider(req).getContainers();
      res.json(containers);
    } catch (err) {
      next(err);
    }
  },

  async getBoards(req: Request, res: Response, next: NextFunction) {
    try {
      const boards = await getProvider(req).getBoards();
      res.json(boards);
    } catch (err) {
      next(err);
    }
  },

  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await getProvider(req).getUsers(req.query.query as string | undefined);
      res.json(users);
    } catch (err) {
      next(err);
    }
  },

  async addTaskToList(req: Request, res: Response, next: NextFunction) {
    try {
      const provider = getProvider(req);
      if (!provider.addTaskToList) {
        throw new FeatureNotSupportedError(provider.providerName, 'addTaskToList');
      }
      const ticket = await provider.addTaskToList(req.params.ticketId, req.params.listId);
      res.json(ticket);
    } catch (err) {
      next(err);
    }
  },

  async removeTaskFromList(req: Request, res: Response, next: NextFunction) {
    try {
      const provider = getProvider(req);
      if (!provider.removeTaskFromList) {
        throw new FeatureNotSupportedError(provider.providerName, 'removeTaskFromList');
      }
      await provider.removeTaskFromList(req.params.ticketId, req.params.listId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
