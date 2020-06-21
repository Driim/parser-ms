import Parser from 'rss-parser';
import { AnnounceDto } from '../../handler';
import { Logger } from '@nestjs/common';

export abstract class AnnounceTransformer {
  protected readonly url: string;
  protected readonly loginUrl?: string;
  protected readonly logger = new Logger(AnnounceTransformer.name);

  constructor (url: string, loginUrl?: string) {
    this.url = url;
    this.loginUrl = loginUrl;
  }

  public getUrl = (): string => {
    return this.url;
  };

  public hasLoginUrl = (): boolean => {
    return this.loginUrl ? true : false;
  };

  public getLoginUrl = (): string => {
    return this.loginUrl;
  };

  protected abstract transformation(data: Parser.Item): AnnounceDto;

  public transform = (data: Parser.Item): AnnounceDto => {
    try {
      return this.transformation(data);
    } catch (error) {
      this.logger.error(`Не смог распарсить ${JSON.stringify(data)}`);
      this.logger.error(error);

      return null;
    }
  };
}
