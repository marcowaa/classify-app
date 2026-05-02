import type { Response } from "express";

interface SSEClient {
  userId: string;
  userType: "parent" | "child" | "teacher";
  res: Response;
}

const MAX_SSE_CLIENTS_PER_USER = Math.max(
  1,
  Number.parseInt(String(process.env["MAX_SSE_CLIENTS_PER_USER"] || "3"), 10) || 3,
);

class SSEManager {
  private clients: Map<string, SSEClient[]> = new Map();

  addClient(userId: string, userType: "parent" | "child" | "teacher", res: Response) {
    const key = `${userType}:${userId}`;
    if (!this.clients.has(key)) {
      this.clients.set(key, []);
    }

    const userClients = this.clients.get(key)!;
    while (userClients.length >= MAX_SSE_CLIENTS_PER_USER) {
      const oldestClient = userClients.shift();
      try {
        oldestClient?.res.end();
      } catch {
      }
    }

    const client: SSEClient = { userId, userType, res };
    userClients.push(client);

    // Remove client on connection close
    res.on("close", () => {
      const clients = this.clients.get(key);
      if (clients) {
        const idx = clients.indexOf(client);
        if (idx > -1) clients.splice(idx, 1);
        if (clients.length === 0) this.clients.delete(key);
      }
    });

    return client;
  }

  /**
   * Send an event to a specific user
   */
  sendToUser(userId: string, userType: "parent" | "child" | "teacher", event: string, data?: any) {
    const key = `${userType}:${userId}`;
    const clients = this.clients.get(key);
    if (!clients || clients.length === 0) return;

    const payload = `event: ${event}\ndata: ${JSON.stringify(data || {})}\n\n`;

    for (const client of clients) {
      try {
        client.res.write(payload);
      } catch {
        // Client disconnected — will be cleaned up on close
      }
    }
  }

  /**
   * Get connected client count (for monitoring)
   */
  getClientCount(): number {
    let count = 0;
    for (const clients of this.clients.values()) {
      count += clients.length;
    }
    return count;
  }
}

// Singleton instance
export const sseManager = new SSEManager();
