import Parser from 'rss-parser';
import { ConfigService } from '@nestjs/config';
import { AnnounceTransformer } from './transform.class';
import { AnnounceDto } from '../../handler';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ColdfilmTransformer extends AnnounceTransformer {
  private readonly studio = 'ColdFilm';
  public readonly name = 'coldfilm';

  constructor (config: ConfigService) {
    super(config.get<string>('COLDFILM_URL'));
  }

  transformation = (data: Parser.Item): AnnounceDto => {
    const slash = /.+\/\s(.+)\s(\d+)\sсезон\s+(\d+)\s+серия\s+/;
    const regexp = /(.+)\s(\d+)\sсезон\s+(\d+)\s+серия\s+/;

    let result = data.title.match(slash);

    if (!result) {
      result = data.title.match(regexp);

      if (!result) {
        return null;
      }
    }

    /** TODO: it could be trailer, find a way to distinguish */
    // if (item.summary.match(/(Трейлер)/i)) {
    //   /* Pass trailers */
    //   resolve(null)
    // }

    const announce = new AnnounceDto();
    announce.name = result[1].trim();
    announce.date = new Date(data.isoDate) || new Date();
    announce.studio = this.studio;
    announce.series = `${result[3].trim()} серия`;
    announce.season = `${result[2]} сезон`;

    return announce;
  };
}
