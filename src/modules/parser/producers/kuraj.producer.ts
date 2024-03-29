import { FeedAnnounceProducer } from './producer.class';
import { ConfigService } from '@nestjs/config';
import { AnnounceDto } from '../../handler';
import { Item } from 'rss-parser';
import { Injectable } from '@nestjs/common';

@Injectable()
export class KurajProducer extends FeedAnnounceProducer {
  private readonly studio = 'Kuraj-Bambey';
  public readonly name = 'kuraj';

  constructor (config: ConfigService) {
    super(config.get<string>('KURAJ_URL'));
  }

  transformation = (data: Item): AnnounceDto => {
    const result = data.title.match(/(.+)\s+(\d+)\s+сезон\s+(\d+)\s+серия/);
    if (!result || result.length == 0) {
      return null;
    }

    const announce = new AnnounceDto();
    announce.date = new Date(data.isoDate) || new Date();
    announce.studio = this.studio;
    announce.name = result[1].trim();
    announce.series = `${parseInt(result[3].trim(), 10)} серия`;
    announce.season = `${parseInt(result[2].trim(), 10)} сезон`;

    return announce;
  };
}
