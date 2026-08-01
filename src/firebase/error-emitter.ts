
'use client';

type ErrorListener = (error: any) => void;

class ErrorEmitter {
  private listeners: { [key: string]: ErrorListener[] } = {};

  on(event: string, listener: ErrorListener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  emit(event: string, error: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(error));
    }
  }

  off(event: string, listener: ErrorListener) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
  }
}

export const errorEmitter = new ErrorEmitter();
