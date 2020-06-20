import Parser from 'rss-parser';
import { TransformInterface } from './transform.interface';
import { AnnounceDto } from '../../handler';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class KubikTransformer implements TransformInterface {
  private readonly studio = 'кубик в кубе';
  public readonly name = 'kubik';
  public readonly url: string;

  constructor (config: ConfigService) {
    this.url = config.get<string>('KUBIK_URL');
  }

  transform = (data: Parser.Item): AnnounceDto => {
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
    announce.date = new Date(data.isoDate) || new Date(data.pubDate) || new Date();
    announce.studio = this.studio;
    announce.name = name;
    announce.series = `${result[6].trim()} серия`;
    announce.season = `${result[3].trim()} сезон`;

    return announce;
  };
}
