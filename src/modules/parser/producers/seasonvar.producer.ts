import { AnnounceProducer } from './producer.class';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cheerio from 'cheerio';
import { AnnounceDto } from '../../../modules/handler';
import { Serial } from '../../../interfaces';

@Injectable()
export class SeasonvarProducer extends AnnounceProducer {
  constructor (config: ConfigService) {
    super(config.get<string>('SEASONVAR_URL'))
  }

  private parseName ($: Cheerio): string {
    const regexp = /(.+) \/ (.+)/;
    const text = $.children('div[class="news-w"]')
      .children('div[class="news_n"]')
      .text()
      .replace(/\r?\n|\r/g, '')
      .trim();

    const name = regexp.exec(text);
    if (name) {
      return name[1];
    }

    return text;
  }

  private cleanText(text: string): RegExpExecArray {
    const regexp = /\((.+)\)/;
    return regexp.exec(text);
  }

  private parseSeries(text: string): { series: string, studio: string } {
    const res = this.cleanText(text);

    if (res) {
      const series = text.substring(0, text.indexOf('(')).trim();
      return { series, studio: res[1] };
    }

    return { series: text, studio: null };
  }

  private parseSeason(text: string): string {
    const result = this.cleanText(text);

    if (result) {
      return result[1];
    }

    return '1 сезон';
  }

  private parseAnnounce($: Cheerio, date: Date): AnnounceDto {
    const announce = new AnnounceDto();

    announce.date = date;
    announce.name = this.parseName($);
    announce.url = new URL($.attr('href'), this.getUrl()).toString();
    const { series, studio } = this.parseSeries(
      $.children('div[class="news-w"]')
        .children('span[class="news_s"]')
        .text()
    );
    announce.series = series;
    if (studio) {
      announce.studio = studio;
    }

    /** I don't remember why I did it */
    $.children('div[class="news-w"]')
      .children('div[class="news_n"]')
      .remove();

    $.children('div[class="news-w"]')
      .children('span')
      .remove();

    announce.season = this.parseSeason($.children('div[class="news-w"]').text());
    
    /** TODO: add parse function to announce */

    return announce;
  }

  async parse (data: string): Promise<AnnounceDto[]> {
    const $ = cheerio.load(data);
    const announces: AnnounceDto[] = [];

    const days = $('div[class="news"]');
    /** checking announces for 3 days */
    const count = Math.min(days.length, 3);
    for (let i = 0; i < count; i++) {
      const [day, month, year] = $(days[i])
        .find('div[class="news-head"]')
        .text().trim().split('.');
      const date = new Date(Date.UTC(+year, +month - 1, +day));
      const news = $(days[i]).find('a');

      for (let j = 0; j < news.length; j++) {
        try {
          announces.push(this.parseAnnounce($(news[j]), date));
        } catch (error) {
          this.logger.error(error);
        }
      }
    }

    return announces;
  }

  /** TODO: move download function to separate service */
  /** TODO: move this function to separate class */
  parsePage = async (url: string, name: string, follow: boolean): Promise<Serial> => {
    return null;
  }
}