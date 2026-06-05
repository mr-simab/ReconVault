import { logger } from "../config/logger";
import { ApiResult, CollectorResult } from "../models/types";

export abstract class BaseCollector {
  constructor(public readonly name: string) {}

  abstract collect(target: string): Promise<CollectorResult>;

  protected unavailableResult<T>(api: string, data: T, reason: string): ApiResult<T> {
    logger.info(`${this.name}: source unavailable for ${api} - ${reason}`);
    return { data, source: "unavailable", api, reason };
  }

  protected realResult<T>(api: string, data: T): ApiResult<T> {
    return { data, source: "real", api };
  }
}
