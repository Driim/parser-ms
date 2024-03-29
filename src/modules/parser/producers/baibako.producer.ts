import Parser from 'rss-parser';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnnounceDto } from '../../handler';
import { FeedAnnounceProducer } from './producer.class';

@Injectable()
export class BaibakoProducer extends FeedAnnounceProducer {
  private readonly studio = 'BaibaKo';
  public readonly name = 'baibako';

  constructor (config: ConfigService) {
    super(config.get<string>('BAIBAKO_URL'), config.get<string>('BAIBAKO_LOGIN'));
  }

  transformation = (data: Parser.Item): AnnounceDto => {
    const result = data.title.match(/\/(.+)\s\/s(\d+)e(\S+)/);

    if (!result || result.length == 0) {
      return null;
    }

    let series = result[3].trim();
    const num = result[3].trim().match(/(\d+)-(\d+)/);
    if (num) {
      series = num[2];
    }

    const announce = new AnnounceDto();
    announce.studio = this.studio;
    announce.name = result[1].trim();
    announce.date = new Date(data.isoDate) || new Date();
    announce.series = `${parseInt(series, 10)} серия`;
    announce.season = `${parseInt(result[2].trim(), 10)} сезон`;

    return announce;
  };
}
