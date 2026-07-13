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

  async searchTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectKeyOrListId, status } = req.query as { projectKeyOrListId?: string; status?: string };
      if (!projectKeyOrListId) {
        res.status(400).json({ message: 'projectKeyOrListId query param is required' });
        return;
      }
      const tickets = await getProvider(req).searchTickets(projectKeyOrListId, status);
      res.json(tickets);
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

  async getWorkspaces(req: Request, res: Response, next: NextFunction) {
    try {
      const provider = getProvider(req);
      if (!provider.getWorkspaces) {
        throw new FeatureNotSupportedError(provider.providerName, 'getWorkspaces');
      }
      const workspaces = await provider.getWorkspaces();
      res.json(workspaces);
    } catch (err) {
      next(err);
    }
  },

  async searchDocs(req: Request, res: Response, next: NextFunction) {
    try {
      const provider = getProvider(req);
      if (!provider.searchDocs) {
        throw new FeatureNotSupportedError(provider.providerName, 'searchDocs');
      }
      const { containerId } = req.query as { containerId?: string };
      if (!containerId) {
        res.status(400).json({ message: 'containerId query param is required' });
        return;
      }
      const docs = await provider.searchDocs(containerId);
      res.json(docs);
    } catch (err) {
      next(err);
    }
  },

  async getDoc(req: Request, res: Response, next: NextFunction) {
    try {
      const provider = getProvider(req);
      if (!provider.getDoc) {
        throw new FeatureNotSupportedError(provider.providerName, 'getDoc');
      }
      const doc = await provider.getDoc(req.params.docId, req.query.containerId as string | undefined);
      res.json(doc);
    } catch (err) {
      next(err);
    }
  },

  async getDocPages(req: Request, res: Response, next: NextFunction) {
    try {
      const provider = getProvider(req);
      if (!provider.getDocPages) {
        throw new FeatureNotSupportedError(provider.providerName, 'getDocPages');
      }
      const pages = await provider.getDocPages(req.params.docId, req.query.containerId as string | undefined);
      res.json(pages);
    } catch (err) {
      next(err);
    }
  },

  async getDocWithPages(req: Request, res: Response, next: NextFunction) {
    try {
      const doc = await getProvider(req).getDocWithPages(
        req.params.docId,
        req.query.containerId as string | undefined,
      );
      res.json(doc);
    } catch (err) {
      next(err);
    }
  },
};
