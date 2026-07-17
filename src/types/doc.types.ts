/** A ClickUp workspace (team) — the value for `containerId` on the doc routes. */
export interface DocContainer {
  id: string;
  name: string;
}

export interface DocSummary {
  id: string;
  name: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * A ClickUp Doc or a Confluence page. `content` is the doc/page's own body —
 * present for Confluence (a page always has a body) but usually absent for
 * ClickUp (a Doc is just a container; its content lives in its pages).
 */
export interface Doc extends DocSummary {
  content?: string;
  raw?: unknown;
}

export interface DocPage {
  id: string;
  title: string;
  content: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
  raw?: unknown;
}

export interface DocWithPages extends Doc {
  pages: DocPage[];
}

export interface CreateDocInput {
  name: string;
}

export interface CreateDocPageInput {
  name: string;
  content: string;
  /** ClickUp: "text/md" (default) or "text/plain". Ignored by providers that don't support it. */
  contentFormat?: string;
}
