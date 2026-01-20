/**
 * Event-Driven Architecture System
 * Demonstrates: Event emitters, pub-sub, middleware, async patterns
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.middleware = [];
    this.eventHistory = [];
  }

  /**
   * Register event listener
   */
  on(event, callback, options = {}) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    const listener = {
      callback,
      once: options.once || false,
      priority: options.priority || 0,
      id: Symbol('listener')
    };
    
    this.listeners.get(event).push(listener);
    
    // Sort by priority (higher first)
    this.listeners.get(event).sort((a, b) => b.priority - a.priority);
    
    return () => this.off(event, listener.id);
  }

  /**
   * Register one-time event listener
   */
  once(event, callback) {
    return this.on(event, callback, { once: true });
  }

  /**
   * Remove event listener
   */
  off(event, listenerId) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.findIndex(l => l.id === listenerId);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  async emit(event, data) {
    const eventData = {
      event,
      data,
      timestamp: Date.now(),
      metadata: {}
    };

    // Run through middleware
    for (const mw of this.middleware) {
      await mw(eventData);
    }

    this.eventHistory.push(eventData);

    const listeners = this.listeners.get(event) || [];
    const oneTimeListeners = [];

    for (const listener of listeners) {
      try {
        await listener.callback(eventData.data);
        
        if (listener.once) {
          oneTimeListeners.push(listener.id);
        }
      } catch (error) {
        console.error(`Error in listener for ${event}:`, error);
      }
    }

    // Remove one-time listeners
    oneTimeListeners.forEach(id => this.off(event, id));
  }

  /**
   * Add middleware
   */
  use(middleware) {
    this.middleware.push(middleware);
  }

  /**
   * Get event history
   */
  getHistory(event = null) {
    if (event) {
      return this.eventHistory.filter(e => e.event === event);
    }
    return this.eventHistory;
  }
}

// Example usage
async function demo() {
  const eventBus = new EventBus();

  // Add logging middleware
  eventBus.use(async (eventData) => {
    console.log(`[Middleware] Event: ${eventData.event}`);
  });

  // Register listeners
  eventBus.on('user.created', async (user) => {
    console.log('Sending welcome email to:', user.email);
  }, { priority: 10 });

  eventBus.on('user.created', async (user) => {
    console.log('Creating user profile for:', user.name);
  }, { priority: 5 });

  eventBus.once('app.started', () => {
    console.log('App initialized!');
  });

  // Emit events
  await eventBus.emit('app.started');
  await eventBus.emit('user.created', {
    name: 'John Doe',
    email: 'john@example.com'
  });

  console.log('\nEvent History:', eventBus.getHistory().length, 'events');
}

demo();
