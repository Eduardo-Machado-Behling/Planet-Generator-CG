export type ElementObserver<T> = (value: T) => void;

export interface VisualElement<T = any> {
  renderHTML(): string;
  triggerOnChange(): boolean;
  subscribe(observer: ElementObserver<T>): () => void;
  attach(root: HTMLElement, onGlobalChange: () => void): void;
  get value(): T;
  set value(v: T);
  toJSON?(): any;

  description?: string;
}
