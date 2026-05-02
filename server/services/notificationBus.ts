type NotificationListener = (notification: Record<string, any>) => void;

class NotificationBus {
  private childListeners = new Map<string, Set<NotificationListener>>();
  private adminListeners = new Map<string, Set<NotificationListener>>();

  // --- Child subscriptions ---
  subscribeChild(childId: string, listener: NotificationListener): () => void {
    const listeners = this.childListeners.get(childId) || new Set<NotificationListener>();
    listeners.add(listener);
    this.childListeners.set(childId, listeners);

    return () => {
      const current = this.childListeners.get(childId);
      if (!current) return;
      current.delete(listener);
      if (current.size === 0) {
        this.childListeners.delete(childId);
      }
    };
  }

  publishToChild(childId: string, notification: Record<string, any>) {
    const listeners = this.childListeners.get(childId);
    if (!listeners || listeners.size === 0) return;

    for (const listener of listeners) {
      try {
        listener(notification);
      } catch {
        // ignore listener errors
      }
    }
  }

  // --- Admin subscriptions ---
  subscribeAdmin(adminId: string, listener: NotificationListener): () => void {
    const listeners = this.adminListeners.get(adminId) || new Set<NotificationListener>();
    listeners.add(listener);
    this.adminListeners.set(adminId, listeners);

    return () => {
      const current = this.adminListeners.get(adminId);
      if (!current) return;
      current.delete(listener);
      if (current.size === 0) {
        this.adminListeners.delete(adminId);
      }
    };
  }

  publishToAdmin(adminId: string, notification: Record<string, any>) {
    const listeners = this.adminListeners.get(adminId);
    if (!listeners || listeners.size === 0) return;

    for (const listener of listeners) {
      try {
        listener(notification);
      } catch {
        // ignore listener errors
      }
    }
  }

  publishToAllAdmins(notification: Record<string, any>) {
    for (const [, listeners] of this.adminListeners) {
      for (const listener of listeners) {
        try {
          listener(notification);
        } catch {
          // ignore listener errors
        }
      }
    }
  }
}

export const notificationBus = new NotificationBus();
