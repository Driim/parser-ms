import axios from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import tough from 'tough-cookie';
import { Injectable, Logger } from '@nestjs/common';
import { AnnounceHandlerService, AnnounceDto } from '../handler';
import {
  BaibakoProducer,
  ColdfilmProducer,
  KubikProducer,
  KurajProducer,
  LostfilmProducer,
  AnnounceProducer,
} from './producers';
import { Interval, Cron } from '@nestjs/schedule';

axiosCookieJarSupport(axios);
type TransformerList = Record<string, AnnounceProducer>;

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);
  private readonly list: TransformerList = {};

  constructor (
    private readonly announceHandler: AnnounceHandlerService,
    baibakoTransformer: BaibakoProducer,
    coldfilmTransformer: ColdfilmProducer,
    kubikTransformer: KubikProducer,
    kurajTransformer: KurajProducer,
    lostfilmTransformer: LostfilmProducer,
  ) {
    this.list[baibakoTransformer.name] = baibakoTransformer;
    this.list[coldfilmTransformer.name] = coldfilmTransformer;
    this.list[kubikTransformer.name] = kubikTransformer;
    this.list[kurajTransformer.name] = kurajTransformer;
    this.list[lostfilmTransformer.name] = lostfilmTransformer;
  }

  private async download (studio: AnnounceProducer): Promise<string> {
    const jar = new tough.CookieJar();

    if (studio.hasLoginUrl()) {
      await axios.get(studio.getLoginUrl(), { jar, withCredentials: true });
    }

    this.logger.log(`Загружаем xml: ${studio.getUrl()}`);

    const result = await axios.get(studio.getUrl(), { jar, withCredentials: true });
    return result.data as string;
  }

  public async check (name: string): Promise<void> {
    this.logger.log(`Проверяем ${name}`);
    const producer = this.list[name];
    if (!producer) {
      this.logger.error(`Не нашел ${name}`);
      return;
    }

    /** TODO: error handling, create interceptor */
    const data = await this.download(producer);
    const announces = await producer.parse(data);

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
    for (const producer of Object.values(this.list)) {
      try {
        const data = await this.download(producer);
        const announces = await producer.parse(data);

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
