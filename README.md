# PM Tools Integration API

Unified REST API for integrating project management tools (Jira, ClickUp) behind a single
contract, exposed via Express.

## Architecture

- `src/interfaces/IPMToolProvider.ts` — the contract every PM tool integration implements.
- `src/abstract/BasePMToolProvider.ts` — abstract class with shared behavior (HTTP client
  setup, error normalization, `getTicketWithComments` composition).
- `src/providers/JiraProvider.ts`, `src/providers/ClickUpProvider.ts` — concrete integrations.
- `src/factory/PMToolProviderFactory.ts` — resolves a provider instance from a `provider` route
  param (`jira` | `clickup`).
- `src/routes`, `src/controllers` — thin Express layer that maps HTTP calls onto the contract.

Adding a new PM tool means implementing `IPMToolProvider` (typically by extending
`BasePMToolProvider`) and registering it in the factory — no route/controller changes needed.

## Setup

```bash
cp .env.example .env   # fill in Jira/ClickUp credentials
npm install
npm run dev             # local dev with ts-node-dev
```

## API

All routes are namespaced by provider: `/api/:provider/...` where `:provider` is `jira` or `clickup`.

| Method | Path | Description |
|---|---|---|
| POST | `/api/:provider/tickets` | Create a ticket. Pass `parentId` to create it as a subtask of an existing ticket. |
| GET | `/api/:provider/tickets/:ticketId` | Get ticket + comments |
| GET | `/api/:provider/tickets/:ticketId/details` | Get ticket only |
| PATCH | `/api/:provider/tickets/:ticketId` | Update ticket fields (title, description, assignee, priority, ...) |
| DELETE | `/api/:provider/tickets/:ticketId` | Delete ticket |
| GET | `/api/:provider/tickets/:ticketId/comments` | List comments |
| POST | `/api/:provider/tickets/:ticketId/comments` | Add a comment |
| GET | `/api/:provider/tickets/:ticketId/statuses` | List available statuses/transitions |
| PATCH | `/api/:provider/tickets/:ticketId/status` | Update ticket status |
| POST | `/api/:provider/tickets/:ticketId/lists/:listId` | ClickUp only — attach a task to an additional list |
| DELETE | `/api/:provider/tickets/:ticketId/lists/:listId` | ClickUp only — detach a task from a list |

`GET /api/:provider/containers` lists the projects (Jira) or lists (ClickUp) you can create tickets in.

`GET /api/:provider/boards` lists Scrum/Kanban boards (Jira) or lists in board view (ClickUp).

`GET /api/:provider/users?query=<name>` searches assignable users — resolve a user's `id` here
before setting it as `assignee` on a create/update request; never hardcode an account ID.

`GET /health` for liveness checks.

## API documentation

The full OpenAPI spec lives in [`openapi.yaml`](./openapi.yaml). It's written to be detailed
enough for an LLM/agent to pick the right route on its own — each operation's `description`
explains when to use it versus similar-looking routes (e.g. `/tickets/:id` vs `/tickets/:id/details`),
what provider-specific ID formats look like, and what side effects to expect.

With the server running:
- Interactive Swagger UI: `http://localhost:3000/docs`
- Raw spec as JSON: `http://localhost:3000/openapi.json`

## Docker

```bash
docker compose up --build
```
