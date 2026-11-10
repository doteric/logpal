import { AsyncLocalStorage } from 'node:async_hooks';
import { LogPalEvent } from './logPalEvent.js';
import { createSamplingRates } from './sampling.js';
import type { FormatOption, LogDataFor } from '../formats/utils/index.js';
import type { LogPalEventOptions, LogPalOptions } from './types.js';

/** Creates event-scoped structured logs using the selected format. */
export class initLogPal<Format extends FormatOption> {
  private readonly sampling: Record<'error' | 'warn' | 'info', number>;
  private readonly output: Pick<Console, 'info' | 'warn' | 'error'>;
  private readonly storage = new AsyncLocalStorage<LogPalEvent<Format>>();
  private readonly eventName: string;
  private readonly format: Format;

  public constructor(options: LogPalOptions<Format>) {
    this.format = options.format;
    this.sampling = createSamplingRates(options.sampling);
    this.output = options.logger ?? console;
    this.eventName = options.eventName;
  }

  public event<T>(
    options: LogPalEventOptions,
    handler: () => T,
  ): T | Promise<T> {
    const event = new LogPalEvent(
      this.eventName,
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

  // TODO: Should I consider calling this differently?
  // Maybe ExternalResponse or ExternalCall instead?
  // TODO: Shouldn't I add the external call before even starting it
  // so that I know that it has been started, but maybe never finished?
  public addUpstreamResponse(data: Record<string, unknown>) {
    this.getActiveEvent().addUpstreamResponse(data);
  }

  public finalize() {
    this.getActiveEvent().finalize();
  }

  private getActiveEvent() {
    const event = this.storage.getStore();
    if (!event) throw new Error('No active LogPal event in this context');
    return event;
  }
}

export default initLogPal;
