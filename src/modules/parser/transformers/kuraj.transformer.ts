import { TransformInterface } from './transform.interface';
import { ConfigService } from '@nestjs/config';
import { AnnounceDto } from 'src/modules/handler';
import Parser from 'rss-parser';
import { Injectable } from '@nestjs/common';

@Injectable()
export class KurajTransformer implements TransformInterface {
  private readonly studio = 'Kuraj-Bambey';
  public readonly name = 'kuraj';
  public readonly url: string;

  constructor (config: ConfigService) {
    this.url = config.get<string>('KURAJ_URL');
  }

  transform = (data: Parser.Item): AnnounceDto => {
    const result = data.title.match(/(.+)\s+(\d+)\s+сезон\s+(\d+)\s+серия/);
    if (!result || result.length == 0) {
      return null;
    }

    const announce = new AnnounceDto();
    announce.date = new Date(data.isoDate) || new Date(data.pubDate) || new Date();
    announce.studio = this.studio;
    announce.name = result[1].trim();
    announce.series = `${result[3].trim()} серия`;
    announce.season = `${result[2].trim()} сезон`;

    return announce;
  };
}
