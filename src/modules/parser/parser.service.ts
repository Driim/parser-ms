import axios, { AxiosProxyConfig, AxiosResponse } from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import tough, { CookieJar } from 'tough-cookie';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { SerialService } from '../serial';
import { AnnounceHandlerService } from '../handler';
import {
  BaibakoProducer,
  ColdfilmProducer,
  KubikProducer,
  KurajProducer,
  LostfilmProducer,
  AnnounceProducer,
} from './producers';
import { SeasonvarProducer } from './producers/seasonvar.producer';

axiosCookieJarSupport(axios);
type TransformerList = Record<string, AnnounceProducer>;

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);
  private readonly studios: TransformerList = {};
  private readonly proxyUrl: string;
  private readonly proxyPort: number;

  constructor (
    @InjectSentry() private readonly client: SentryService,
    private readonly announceHandler: AnnounceHandlerService,
    private readonly seasonvarProducer: SeasonvarProducer,
    private readonly serialService: SerialService,
    baibakoTransformer: BaibakoProducer,
    coldfilmTransformer: ColdfilmProducer,
    kubikTransformer: KubikProducer,
    kurajTransformer: KurajProducer,
    lostfilmTransformer: LostfilmProducer,
    config: ConfigService,
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

  downloadPage = async (
    url: string,
    proxy?: AxiosProxyConfig,
    jar?: CookieJar,
  ): Promise<AxiosResponse<any>> => {
    this.logger.log(`Загружаем ${url}`);
    return await axios.get(url, { proxy, jar, timeout: 10000, withCredentials: true });
  };

  private async downloadProducersPage (studio: AnnounceProducer): Promise<string> {
    const jar = new tough.CookieJar();
    let proxy: AxiosProxyConfig = undefined;

    if (this.proxyUrl) {
      proxy = { host: this.proxyUrl, port: this.proxyPort };
    }

    if (studio.hasLoginUrl()) {
      await this.downloadPage(studio.getLoginUrl(), proxy, jar);
    }

    const result = await this.downloadPage(studio.getUrl(), proxy, jar);
    return result.data as string;
  }

  private async checkProducer (producer: AnnounceProducer): Promise<void> {
    const data = await this.downloadProducersPage(producer);
    const announces = await producer.parse(data);

    if (!announces || announces.length == 0) {
      this.logger.warn(`Нет анонсов`);
      return;
    }

    let proxy: AxiosProxyConfig = undefined;

    if (this.proxyUrl) {
      proxy = { host: this.proxyUrl, port: this.proxyPort };
    }

    this.logger.log(`Обрабатываем ${announces.length} новостей`);

    const { newSerials, newSeasons } = await this.announceHandler.process(announces);

    /** All new seasons already announces, so just add new season */
    for (const { announce, serial } of newSeasons) {
      if (!announce.url || !announce.producer) {
        continue;
      }

      let page;
      try {
        page = await this.downloadPage(announce.url, proxy);
      } catch (error) {
        this.client.instance().captureException(error);
        continue;
      }

      const season = await announce.producer.parseSeason(page.data, announce.url);
      this.logger.log(`Добавляем ${season.name} сериалу ${serial.name}`);

      await this.serialService.addSeason(serial, season);
    }

    /** All announces will be handled next time, now just add serials */
    for (const announce of newSerials) {
      if (!announce.url || !announce.producer) {
        continue;
      }

      let page;
      try {
        page = await this.downloadPage(announce.url, proxy);
      } catch (error) {
        this.client.instance().captureException(error);
        continue;
      }

      const { serial, links } = await announce.producer.parseSerial(page.data, announce.name);
      await this.serialService.addNewSerial(serial);
      this.logger.log(`Добавляем новый сериал ${serial.name}`);

      for (const link of links) {
        let page;
        try {
          page = await this.downloadPage(link, proxy);
        } catch (error) {
          this.client.instance().captureException(error);
          continue;
        }

        const season = await announce.producer.parseSeason(page.data, link);
        this.logger.log(`Добавляем ${season.name} сериалу ${serial.name}`);

        /** this also save serial */
        await this.serialService.addSeason(serial, season);
      }
    }
  }

  // @Interval(15000)
  // async testSeasonvar() {
  //   try {
  //     // await this.checkProducer(this.studios['coldfilm']);
  //     await this.checkProducer(this.seasonvarProducer);
  //   } catch (error) {
  //     this.logger.error(error);
  //     this.client.instance().captureException(error);
  //   }
  // }

  /** Every hour at 10 min */
  @Cron('0 10 * * * *')
  async checkVoiceoverStudios (): Promise<void> {
    for (const producer of Object.values(this.studios)) {
      try {
        await this.checkProducer(producer);
      } catch (error) {
        this.logger.error(error);
        this.client.instance().captureException(error);
      }
    }
  }

  /** Every hour at 30 min */
  @Cron('0 30 * * * *')
  async checkSeasonvar (): Promise<void> {
    try {
      await this.checkProducer(this.seasonvarProducer);
    } catch (error) {
      this.logger.error(error);
      this.client.instance().captureException(error);
    }
  }
}
