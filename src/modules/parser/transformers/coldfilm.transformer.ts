import Parser from 'rss-parser';
import { ConfigService } from '@nestjs/config';
import { TransformInterface } from './transform.interface';
import { AnnounceDto } from '../../handler';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ColdfilmTransformer implements TransformInterface {
  private readonly studio = 'ColdFilm';
  public readonly name = 'coldfilm';
  public readonly url: string;

  constructor (config: ConfigService) {
    this.url = config.get<string>('COLDFILM_URL');
  }

  transform = (data: Parser.Item): AnnounceDto => {
    const slash = /.+\/\s(.+)\s(\d+)\sсезон\s+(\d+)\s+серия\s+/;
    const regexp = /(.+)\s(\d+)\sсезон\s+(\d+)\s+серия\s+/;

    let result = data.title.match(slash);

    if (!result) {
      result = data.title.match(regexp);

      if (!result) {
        return null;
      }
    }

    console.log(data);
    /** TODO: it could be trailer, find a way to distinguish */
    // if (item.summary.match(/(Трейлер)/i)) {
    //   /* Pass trailers */
    //   resolve(null)
    // }

    const announce = new AnnounceDto();
    announce.name = result[1].trim();
    announce.date = new Date(data.isoDate) || new Date(data.pubDate) || new Date();
    announce.studio = this.studio;
    announce.series = `${result[3].trim()} серия`;
    announce.season = `${result[2]} сезон`;

    return announce;
  };
}
