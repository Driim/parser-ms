import Parser from 'rss-parser';
import uniqWith from 'lodash.uniqwith';
import axios from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import tough from 'tough-cookie';
import { Injectable, Logger } from '@nestjs/common';
import { AnnounceHandlerService, AnnounceDto } from '../handler';
import {
  BaibakoTransformer,
  ColdfilmTransformer,
  KubikTransformer,
  KurajTransformer,
  LostfilmTransformer,
  AnnounceTransformer,
} from './transformers';
import { Interval, Cron } from '@nestjs/schedule';

axiosCookieJarSupport(axios);
type TransformerList = Record<string, AnnounceTransformer>;

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

  private async download (studio: AnnounceTransformer): Promise<string> {
    const jar = new tough.CookieJar();

    if (studio.hasLoginUrl()) {
      await axios.get(studio.getLoginUrl(), { jar, withCredentials: true });
    }

    this.logger.log(`Загружаем xml: ${studio.getUrl()}`);

    const result = await axios.get(studio.getUrl(), { jar, withCredentials: true });
    return result.data as string;
  }

  private async parse (data: string, studio: AnnounceTransformer): Promise<AnnounceDto[]> {
    const feed = await this.rssParser.parseString(data);
    const allAnnounces = feed.items.map(studio.transform).filter((item) => item != null);

    return uniqWith(
      allAnnounces,
      (a: AnnounceDto, b: AnnounceDto) =>
        a.name === b.name && a.season === b.season && a.series === b.series && a.studio == b.studio,
    );
  }

  public async check (name: string): Promise<void> {
    this.logger.log(`Проверяем ${name}`);
    const studio = this.list[name];
    if (!studio) {
      this.logger.error(`Не нашел ${name}`);
      return;
    }

    /** TODO: error handling, create interceptor */
    const data = await this.download(studio);
    const announces = await this.parse(data, studio);

    if (!announces || announces.length == 0) {
      this.logger.warn(`Нет аннонсов ${name}`);
      return;
    }

    return this.announceHandler.process(announces);
  }

  // @Interval(3000)
  // async test (): Promise<void> {
  //   return this.check('lostfilm');
  // }

  /** Every hour at 10 min */
  @Cron('0 10 * * * *')
  async checkVoiceoverStudios (): Promise<void> {
    for (const studio of Object.values(this.list)) {
      try {
        const data = await this.download(studio);
        const announces = await this.parse(data, studio);

        if (!announces || announces.length == 0) {
          this.logger.warn(`Нет аннонсов ${name}`);
          continue;
        }

        await this.announceHandler.process(announces);
      } catch (error) {
        this.logger.error(error);
        continue;
      }
    }
  }
}
