import axios, { AxiosProxyConfig } from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import tough from 'tough-cookie';
import { Injectable, Logger } from '@nestjs/common';
import { AnnounceHandlerService } from '../handler';
import {
  BaibakoProducer,
  ColdfilmProducer,
  KubikProducer,
  KurajProducer,
  LostfilmProducer,
  AnnounceProducer,
} from './producers';
import { Cron, Interval } from '@nestjs/schedule';
import { SeasonvarProducer } from './producers/seasonvar.producer';
import { ConfigService } from '@nestjs/config';

axiosCookieJarSupport(axios);
type TransformerList = Record<string, AnnounceProducer>;

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);
  private readonly studios: TransformerList = {};
  private readonly proxyUrl: string;
  private readonly proxyPort: number;

  constructor (
    private readonly announceHandler: AnnounceHandlerService,
    private readonly seasonvarProducer: SeasonvarProducer,
    baibakoTransformer: BaibakoProducer,
    coldfilmTransformer: ColdfilmProducer,
    kubikTransformer: KubikProducer,
    kurajTransformer: KurajProducer,
    lostfilmTransformer: LostfilmProducer,
    config: ConfigService
  ) {
    this.studios[baibakoTransformer.name] = baibakoTransformer;
    this.studios[coldfilmTransformer.name] = coldfilmTransformer;
    this.studios[kubikTransformer.name] = kubikTransformer;
    this.studios[kurajTransformer.name] = kurajTransformer;
    this.studios[lostfilmTransformer.name] = lostfilmTransformer;

    if (config.get<string>('PROXY_URL') !== '') {
      this.proxyUrl = config.get<string>('PROXY_URL');
      this.proxyPort = parseInt(config.get<string>('PROXY_PORT'), 10);
    }
  }

  private async download (studio: AnnounceProducer): Promise<string> {
    const jar = new tough.CookieJar();
    let proxy: AxiosProxyConfig = null;

    if (this.proxyUrl) {
      proxy = { host: this.proxyUrl, port: this.proxyPort };
    }

    if (studio.hasLoginUrl()) {
      await axios.get(studio.getLoginUrl(), {
        proxy,
        jar,
        timeout: 10000,
        withCredentials: true,
      });
    }

    this.logger.log(`Загружаем xml: ${studio.getUrl()}`);

    const result = await axios.get(studio.getUrl(), {
      proxy,
      jar,
      timeout: 10000,
      withCredentials: true,
    });
    return result.data as string;
  }

  private async checkProducer(producer: AnnounceProducer): Promise<void> {
    const data = await this.download(producer);
    const announces = await producer.parse(data);

    if (!announces || announces.length == 0) {
      this.logger.warn(`Нет анонсов`);
      return;
    }

    this.logger.log(`Обрабатываем ${announces.length} новостей`);

    await this.announceHandler.process(announces);
  }

  @Interval(15000)
  async testSeasonvar() {
    // await this.checkProducer(this.studios['lostfilm']);
    await this.checkProducer(this.seasonvarProducer);
  }

  /** Every hour at 10 min */
  @Cron('0 10 * * * *')
  async checkVoiceoverStudios (): Promise<void> {
    for (const producer of Object.values(this.studios)) {
      try {
        this.checkProducer(producer);
      } catch (error) {
        this.logger.error(error);
      }
    }
  }

  /** Every hour at 30 min */
  @Cron('0 30 * * * *')
  async checkSeasonvar (): Promise<void> {
    try {
      this.checkProducer(this.seasonvarProducer);
    } catch (error) {
      this.logger.error(error);
    }
  }
}
