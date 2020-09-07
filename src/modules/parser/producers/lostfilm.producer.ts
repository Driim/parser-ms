import { Item } from 'rss-parser';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { AnnounceDto } from '../../handler';
import { FeedAnnounceProducer } from './producer.class';

@Injectable()
export class LostfilmProducer extends FeedAnnounceProducer {
  private readonly studio = 'LostFilm';
  public readonly name = 'lostfilm';
  public readonly url: string;

  constructor (config: ConfigService) {
    super(config.get<string>('LOSTFILM_URL'));
  }

  transformation = (data: Item): AnnounceDto => {
    const result = data.title.match(/(.+)\s\((.+)\)..+\(S(\d+)E(\d+)\)/);
    if (!result) {
      return null;
    }

    const announce = new AnnounceDto();
    announce.name = result[1].trim();
    announce.date = new Date(data.isoDate) || new Date();
    announce.studio = this.studio;
    announce.series = `${result[4].trim()} серия`;
    /** Lostfilm uses 01 */
    announce.season = `${parseInt(result[3].trim(), 10)} сезон`;

    return announce;
  };
}
