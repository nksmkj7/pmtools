export class PMToolError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly cause?: unknown,
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'PMToolError';
  }
}

export class TicketNotFoundError extends PMToolError {
  constructor(provider: string, ticketId: string) {
    super(provider, `Ticket "${ticketId}" not found`, 404);
    this.name = 'TicketNotFoundError';
  }
}

export class FeatureNotSupportedError extends PMToolError {
  constructor(provider: string, feature: string) {
    super(provider, `"${feature}" is not supported by ${provider}`, 400);
    this.name = 'FeatureNotSupportedError';
  }
}
