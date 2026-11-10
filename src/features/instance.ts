import { AsyncLocalStorage } from 'node:async_hooks';
import { LogPalEvent } from './logPalEvent.js';
import { createSamplingRates } from './sampling.js';
import type { FormatOption, LogDataFor } from '../formats/utils/index.js';
import type {
  LogPalEventOptions,
  LogPalOptions,
  ProvidedInitExternalCallData,
} from './types.js';

/** Creates event-scoped structured logs using the selected format. */
export class initLogPal<Format extends FormatOption> {
  private readonly sampling: Record<'error' | 'warn' | 'info', number>;
  private readonly output: Pick<Console, 'info' | 'warn' | 'error'>;
  private readonly storage = new AsyncLocalStorage<LogPalEvent<Format>>();
  private readonly eventType: string;
  private readonly format: Format;

  public constructor(options: LogPalOptions<Format>) {
    this.format = options.format;
    this.sampling = createSamplingRates(options.sampling);
    this.output = options.logger ?? console;
    this.eventType = options.eventType;
    if (options.logInitialization !== false) this.logInitialization();
  }

  public event<T>(
    options: LogPalEventOptions,
    handler: () => T,
  ): T | Promise<T> {
    const event = new LogPalEvent(
      this.eventType,
      this.format,
      options,
      this.sampling,
      this.output,
    );
    return this.storage.run(event, () => event.handle(handler));
  }

  public current() {
    return this.storage.getStore() ? this : undefined;
  }

  public addData(data: LogDataFor<Format>) {
    this.getActiveEvent().addData(data);
  }

  public addError(data: Record<string, unknown>) {
    this.getActiveEvent().addError(data);
  }

  public addWarning(data: Record<string, unknown>) {
    this.getActiveEvent().addWarning(data);
  }

  /** Starts an external call record that can be finished after the request. */
  public initExternalCall(data: ProvidedInitExternalCallData) {
    return this.getActiveEvent().initExternalCall(data);
  }

  public finalize() {
    this.getActiveEvent().finalize();
  }

  private getActiveEvent() {
    const event = this.storage.getStore();
    if (!event) throw new Error('No active LogPal event in this context');
    return event;
  }

  private logInitialization() {
    this.output.info(
      JSON.stringify({
        eventType: 'logpal-init',
        logpal: {
          eventType: this.eventType,
          format: typeof this.format === 'string' ? this.format : 'custom',
          sampling: this.sampling,
        },
      }),
    );
  }
}

export default initLogPal;
