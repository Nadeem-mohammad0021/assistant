class SharedTimer {
  private subscribers: Set<(now: Date) => void> = new Set();
  private intervalId: NodeJS.Timeout | null = null;

  subscribe(callback: (now: Date) => void): () => void {
    this.subscribers.add(callback);
    
    if (!this.intervalId) {
      this.intervalId = setInterval(() => {
        const now = new Date();
        this.subscribers.forEach(sub => sub(now));
      }, 1000);
    }
    
    return () => {
      this.subscribers.delete(callback);
      if (this.subscribers.size === 0 && this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    };
  }
}

export const sharedTimer = new SharedTimer();