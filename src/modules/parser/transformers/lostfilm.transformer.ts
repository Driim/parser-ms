import Parser from 'rss-parser';
import { ConfigService } from '@nestjs/config';
import { AnnounceDto } from '../../handler';
import { TransformInterface } from './transform.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LostfilmTransformer implements TransformInterface {
  private readonly studio = 'LostFilm';
  public readonly name = 'lostfilm';
  public readonly url: string;

  constructor (config: ConfigService) {
    this.url = config.get<string>('LOSTFILM_URL');
  }

  transform = (data: Parser.Item): AnnounceDto => {
    const result = data.title.match(/(.+)\s\((.+)\)..+\(S(\d+)E(\d+)\)/);
    if (!result) {
      return null;
    }

    const announce = new AnnounceDto();
    announce.name = result[1].trim();
    announce.date = new Date(data.isoDate) || new Date(data.pubDate) || new Date();
    announce.studio = this.studio;
    announce.series = `${result[4].trim()} серия`;
    announce.season = `${result[3].trim()} сезон`;

    return announce;
  };
}
