import Parser from 'rss-parser';
import uniqWith from 'lodash.uniqwith';
import axios from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import tough from 'tough-cookie';
import { Injectable, Logger } from '@nestjs/common';
import { AnnounceHandlerService, AnnounceDto } from '../handler';
import {
  TransformInterface,
  BaibakoTransformer,
  ColdfilmTransformer,
  KubikTransformer,
  KurajTransformer,
  LostfilmTransformer,
} from './transformers';

axiosCookieJarSupport(axios);
type ParserFunction = (data: Parser.Item) => AnnounceDto;
type TransformerList = Record<string, TransformInterface>;

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);
  private readonly list: TransformerList = {};
  private readonly rssParser: Parser;

  constructor (
    private readonly announceHandler: AnnounceHandlerService,
    baibakoTransformer: BaibakoTransformer,
    coldfilmTransformer: ColdfilmTransformer,
    kubikTransformer: KubikTransformer,
    kurajTransformer: KurajTransformer,
    lostfilmTransformer: LostfilmTransformer,
  ) {
    this.rssParser = new Parser();
    this.list[baibakoTransformer.name] = baibakoTransformer;
    this.list[coldfilmTransformer.name] = coldfilmTransformer;
    this.list[kubikTransformer.name] = kubikTransformer;
    this.list[kurajTransformer.name] = kurajTransformer;
    this.list[lostfilmTransformer.name] = lostfilmTransformer;
  }

  private async download (url: string, loginUrl?: string): Promise<string> {
    const jar = new tough.CookieJar();

    if (loginUrl) {
      await axios.get(loginUrl, { jar, withCredentials: true });
    }

    this.logger.log(`Загружаем xml: ${url}`);

    const result = await axios.get(url, { jar, responseType: 'text' });
    return result.data as string;
  }

  private async parse (data: string, parser: ParserFunction): Promise<AnnounceDto[]> {
    const feed = await this.rssParser.parseString(data);
    const allAnnounces = feed.items.map(parser).filter((item) => item != null);

    return uniqWith(
      allAnnounces,
      (a: AnnounceDto, b: AnnounceDto) =>
        a.name === b.name && a.season === b.season && a.series === b.series && a.studio == b.studio,
    );
  }

  public async check (name: string): Promise<void> {
    this.logger.log(`Проверяем ${name}`);
    const transformer = this.list[name];
    if (!transformer) {
      this.logger.error(`Не нашел ${name}`);
      return;
    }

    const site = await this.download(transformer.url, transformer.loginUrl);
    const announces = await this.parse(site, transformer.transform);

    if (!announces || announces.length == 0) {
      this.logger.warn(`Нет аннонсов ${name}`);
      return;
    }

    return this.announceHandler.process(announces);
  }
}
