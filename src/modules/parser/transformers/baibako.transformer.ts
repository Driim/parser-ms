import Parser from 'rss-parser';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnnounceDto } from '../../handler';
import { TransformInterface } from './transform.interface';

@Injectable()
export class BaibakoTransformer implements TransformInterface {
  private readonly studio = 'BaibaKo';
  public readonly name = 'baibako';
  public readonly url: string;
  public readonly loginUrl: string;

  constructor (config: ConfigService) {
    this.url = config.get<string>('BAIBAKO_URL');
    this.loginUrl = config.get<string>('BAIBAKO_LOGIN');
  }

  transform = (data: Parser.Item): AnnounceDto => {
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
    announce.date = new Date(data.isoDate) || new Date(data.pubDate) || new Date();
    announce.series = `${series} серия`;
    announce.season = `${result[2].trim()} сезон`;

    return announce;
  };
}
