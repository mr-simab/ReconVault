import { logger } from "../config/logger";
import { ApiResult, CollectorResult } from "../models/types";

export abstract class BaseCollector {
  constructor(public readonly name: string) {}

  abstract collect(target: string): Promise<CollectorResult>;

  protected mockResult<T>(api: string, data: T, reason: string): ApiResult<T> {
    logger.info(`${this.name}: using mock fallback for ${api} - ${reason}`);
    return { data, source: "mock", api, reason };
  }

  protected realResult<T>(api: string, data: T): ApiResult<T> {
    return { data, source: "real", api };
  }
}
