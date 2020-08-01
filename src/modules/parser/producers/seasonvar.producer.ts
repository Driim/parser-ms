import { AnnounceProducer } from './producer.class';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cheerio from 'cheerio';
import { AnnounceDto } from '../../../modules/handler';
import { Serial, Season } from '../../../interfaces';
import { Model } from 'mongoose';
import { SERIAL_MODEL } from '../../../constants.app';
import { InjectModel } from '@nestjs/mongoose';

const S_INFO_DIV = 'div[class="pgs-sinfo-info"]';
const S_INFO_LIST = 'div[class="pgs-sinfo_list"]';
const S_INFO_ACTOR = 'div[class="pgs-sinfo-actor"]';
const S_INFO_DESC = 'div[class="pgs-sinfo-info"]';
@Injectable()
export class SeasonvarProducer extends AnnounceProducer {
  constructor (@InjectModel(SERIAL_MODEL) private serial: Model<Serial>, config: ConfigService) {
    super(config.get<string>('SEASONVAR_URL'));
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

  private cleanText (text: string): RegExpExecArray {
    const regexp = /\((.+)\)/;
    return regexp.exec(text);
  }

  private parseSeries (text: string): Array<{ series: string; studio: string }> {
    const res = this.cleanText(text);

    if (res) {
      const series = text.substring(0, text.indexOf('(')).trim();
      const studios = res[1].split(',').map((studio) => studio.trim());
      return studios.map((studio) => ({ series, studio }));
    }

    return [{ series: text, studio: null }];
  }

  private parseSeasonName (text: string): string {
    const result = this.cleanText(text);

    if (result) {
      return result[1];
    }

    return '1 сезон';
  }

  private parseAnnounce ($: Cheerio, date: Date): AnnounceDto[] {
    const announce = new AnnounceDto();

    announce.date = date;
    const name = this.parseName($);
    const url = new URL($.attr('href'), this.getUrl()).toString();
    const producer = this;
    const series = this.parseSeries(
      $.children('div[class="news-w"]')
        .children('span[class="news_s"]')
        .text(),
    );

    const announces = series.map(({ series, studio }) => {
      const announce = new AnnounceDto();

      announce.date = date;
      announce.name = name;
      announce.url = url;
      announce.producer = producer;
      announce.series = series;
      if (studio) {
        announce.studio = studio;
      }

      return announce;
    });

    /** I don't remember why I did it */
    $.children('div[class="news-w"]')
      .children('div[class="news_n"]')
      .remove();

    $.children('div[class="news-w"]')
      .children('span')
      .remove();

    const season = this.parseSeasonName($.children('div[class="news-w"]').text());

    return announces.map((announce) => {
      announce.season = season;
      return announce;
    });
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
        .text()
        .trim()
        .split('.');
      const date = new Date(Date.UTC(+year, +month - 1, +day));
      const news = $(days[i]).find('a');

      for (let j = 0; j < news.length; j++) {
        try {
          announces.push(...this.parseAnnounce($(news[j]), date));
        } catch (error) {
          this.logger.error(error);
        }
      }
    }

    return announces;
  }

  private getAttrList ($: CheerioStatic) {
    return $(S_INFO_DIV).children(S_INFO_LIST);
  }

  private parseStringArray (line: string): string[] {
    return line
      ? line
          .trim()
          .split(',')
          .map((str) => str.trim())
      : [];
  }

  private parseAlias ($: CheerioStatic): string[] {
    const alias = [];

    this.getAttrList($)
      .first()
      .children('span')
      .each(function (val) {
        alias.push(
          $(this)
            .text()
            .trim(),
        );
      });

    return alias;
  }

  private parseGenre ($: CheerioStatic): string[] {
    return this.parseStringArray(
      this.getAttrList($)
        .eq(1)
        .children('span')
        .eq(0)
        .text(),
    );
  }

  private parseCountry ($: CheerioStatic): string[] {
    return this.parseStringArray(
      this.getAttrList($)
        .eq(1)
        .children('span')
        .eq(-1)
        .text(),
    );
  }

  private parseDirector ($: CheerioStatic): string[] {
    const director = [];

    this.getAttrList($)
      .eq(2)
      .children('div')
      .children('span')
      .each(function () {
        director.push(
          $(this)
            .text()
            .trim(),
        );
      });

    return director;
  }

  private parseActors ($: CheerioStatic): string[] {
    const actors = [];

    $(S_INFO_ACTOR)
      .children('a')
      .each(function () {
        actors.push(
          $(this)
            .children('span')
            .text()
            .trim(),
        );
      });

    return actors;
  }

  private parseStarts ($: CheerioStatic): number {
    return parseInt(
      this.getAttrList($)
        .eq(2)
        .children('span')
        .eq(0)
        .text(),
      10,
    );
  }

  private parseSeasonFromTitle ($: CheerioStatic): string {
    const regexp = /Сериал\s+.+(\d+ сезон)\s+онлайн$/;
    const title = $('h1[class="pgs-sinfo-title"]')
      .text()
      .trim();
    const result = regexp.exec(title);

    return result ? result[1] : '1 сезон';
  }

  public async parseSerial (
    data: string,
    name: string,
  ): Promise<{ serial: Serial; links: string[] }> {
    const $ = cheerio.load(data);
    const serial = new this.serial({
      name,
      alias: this.parseAlias($),
      genre: this.parseGenre($),
      country: this.parseCountry($),
      director: this.parseDirector($),
      voiceover: [],
      season: [],
    });

    const self = this;
    const links = [];
    $('h2').each(function () {
      links.push(
        self.url +
          $(this)
            .children('a')
            .first()
            .attr('href'),
      );
    });

    return { serial, links };
  }

  public async parseSeason (data: string, url: string): Promise<Season> {
    const $ = cheerio.load(data);

    const season: Season = {
      url,
      name: this.parseSeasonFromTitle($),
      desc: $(S_INFO_DESC)
        .children('p')
        .text(),
      img: $('.poster')
        .children('img')
        .attr('src'),
      starts: this.parseStarts($),
      actors: this.parseActors($),
    };

    return season;
  }
}
