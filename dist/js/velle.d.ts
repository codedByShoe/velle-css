// Types for velle.js. Keep the exports in step with it; a Go test checks that they match.

type Ctor<E extends Element = Element> = abstract new (...args: any[]) => E
type Targets = Record<string, Ctor>
type Widen<V> = V extends string ? string : V extends number ? number : V extends boolean ? boolean : V

/** The event an action receives, with data-<name>-<param>-param attributes in `params`. */
export interface ActionEvent<P = Record<string, unknown>> extends Event {
  params: P
}

export declare class Controller<E extends Element = HTMLElement, T extends Targets = Targets> {
  constructor(element: E, name: string)
  readonly element: E
  readonly name: string
  /** Aborts when the controller disconnects. */
  readonly signal: AbortSignal
  /** First element for each target, or null. */
  readonly $: { readonly [K in keyof T]: InstanceType<T[K]> | null }
  /** All elements for each target. */
  readonly $$: { readonly [K in keyof T]: InstanceType<T[K]>[] }
  connect(): void
  disconnect(): void
  /** addEventListener that is removed automatically when the controller disconnects. */
  on<K extends keyof HTMLElementEventMap>(
    target: EventTarget,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions
  ): void
  on(target: EventTarget, type: string, listener: (event: Event) => void, options?: AddEventListenerOptions): void
  targets(name: string): Element[]
  target(name: string): Element | null
  hasTarget(name: string): boolean
  data(key: string): string | null
  hasData(key: string): boolean
  dispatch(type: string, detail?: unknown): void
}

/** The properties controller() adds for its values. */
export type Values<V extends Record<string, unknown>> = { [K in keyof V]: Widen<V[K]> }

/** Builds a Controller subclass with typed targets and data-attribute backed values. */
export declare function controller<
  T extends Targets = {},
  V extends Record<string, unknown> = {},
  E extends Element = HTMLElement
>(spec?: { targets?: T; values?: V }): new (element: E, name: string) => Controller<E, T> & Values<V>

/** Registers a controller for every element with a data-<name> attribute. */
export declare function define(name: string, controller: new (element: any, name: string) => Controller<any, any>): void

/** Runs callbacks as elements start and stop matching a selector. */
export declare function observe(selector: string, callbacks?: {
  connect?(element: Element): void
  disconnect?(element: Element): void
}): unknown

/** The connected instance of a controller on an element, or null. */
export declare function controllerFor<C extends Controller<any, any> = Controller>(element: Element, name: string): C | null

/** Trailing-edge debounce. */
export declare function debounce<F extends (...args: any[]) => void>(fn: F, wait: number): F
