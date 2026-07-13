import { Router } from 'express';
import { ticketController } from '../controllers/ticket.controller';
import { validateProvider } from '../middleware/validateProvider';

const router = Router({ mergeParams: true });

router.use('/:provider', validateProvider);

router.get('/:provider/containers', ticketController.getContainers);
router.get('/:provider/boards', ticketController.getBoards);
router.get('/:provider/users', ticketController.getUsers);

router.get('/:provider/tickets', ticketController.searchTickets);
router.post('/:provider/tickets', ticketController.createTicket);
router.get('/:provider/tickets/:ticketId', ticketController.getTicketWithComments);
router.get('/:provider/tickets/:ticketId/details', ticketController.getTicket);
router.patch('/:provider/tickets/:ticketId', ticketController.updateTicket);
router.delete('/:provider/tickets/:ticketId', ticketController.deleteTicket);

router.get('/:provider/tickets/:ticketId/comments', ticketController.getComments);
router.post('/:provider/tickets/:ticketId/comments', ticketController.addComment);

router.get('/:provider/tickets/:ticketId/statuses', ticketController.getAvailableStatuses);
router.patch('/:provider/tickets/:ticketId/status', ticketController.updateStatus);

router.post('/:provider/tickets/:ticketId/lists/:listId', ticketController.addTaskToList);
router.delete('/:provider/tickets/:ticketId/lists/:listId', ticketController.removeTaskFromList);

// Docs (ClickUp) / Confluence pages (Jira). `containerId` query param is the
// ClickUp workspaceId or the Confluence spaceKey.
router.get('/:provider/workspaces', ticketController.getWorkspaces);
router.get('/:provider/docs', ticketController.searchDocs);
router.get('/:provider/docs/:docId', ticketController.getDocWithPages);
router.get('/:provider/docs/:docId/details', ticketController.getDoc);
router.get('/:provider/docs/:docId/pages', ticketController.getDocPages);

export default router;
