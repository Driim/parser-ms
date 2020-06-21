import Parser from 'rss-parser';
import uniqWith from 'lodash.uniqwith';
import { Logger } from '@nestjs/common';
import { AnnounceDto } from '../../handler';

export abstract class AnnounceProducer {
  protected readonly url: string;
  protected readonly loginUrl?: string;
  protected readonly logger = new Logger(AnnounceProducer.name);

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

  public abstract async parse(data: string): Promise<AnnounceDto[]>;
}

export abstract class FeedAnnounceProducer extends AnnounceProducer {
  private readonly rssParser: Parser;

  constructor (url: string, loginUrl?: string) {
    super(url, loginUrl);

    this.rssParser = new Parser();
  }

  protected abstract transformation(data: Parser.Item): AnnounceDto;

  private transform = (data: Parser.Item): AnnounceDto => {
    try {
      return this.transformation(data);
    } catch (error) {
      this.logger.error(`Не смог распарсить ${JSON.stringify(data)}`);
      this.logger.error(error);

      return null;
    }
  };

  private isEmpty = (item: AnnounceDto): boolean => item != null;

  public async parse (data: string): Promise<AnnounceDto[]> {
    const feed = await this.rssParser.parseString(data);
    const allAnnounces = feed.items.map(this.transform).filter(this.isEmpty);

    return uniqWith(
      allAnnounces,
      (a: AnnounceDto, b: AnnounceDto) =>
        a.name === b.name && a.season === b.season && a.series === b.series && a.studio == b.studio,
    );
  }
}
