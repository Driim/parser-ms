import { Item } from 'rss-parser';
import { FeedAnnounceProducer } from './producer.class';
import { AnnounceDto } from '../../handler';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class KubikProducer extends FeedAnnounceProducer {
  private readonly studio = 'кубик в кубе';
  public readonly name = 'kubik';

  constructor (config: ConfigService) {
    super(config.get<string>('KUBIK_URL'));
  }

  transformation = (data: Item): AnnounceDto => {
    const regexp = /\/\s?(.+)(Сезон|Сезон:)\s(\d)(\s?\/\s?|\s+)(Эпизод|Эпизоды|Серии|Серии:)\s?\d-(\d+)(.+)(Кубик в Кубе)\)$/;
    const result = data.title.match(regexp);
    if (!result || result.length == 0) {
      return null;
    }

    let name = result[1].trim();
    if (name.indexOf('/') !== -1) {
      name = name.slice(0, name.indexOf('/')).trim();
    }

    if (name.indexOf('|') !== -1) {
      name = name.slice(0, name.indexOf('|')).trim();
    }

    const announce = new AnnounceDto();
    announce.date = new Date(data.isoDate) || new Date();
    announce.studio = this.studio;
    announce.name = name;
    announce.series = `${parseInt(result[6].trim(), 10)} серия`;
    announce.season = `${parseInt(result[3].trim(), 10)} сезон`;

    return announce;
  };
}
