import { validate } from 'class-validator';
import { classToPlain } from 'class-transformer';
import { Model } from 'mongoose';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { ANNOUNCE_MODEL, TRANSPORT_SERVICE } from '../../constants.app';
import { Serial, Announce } from '../../interfaces';
import { SerialService } from '../serial';
import { AnnounceDto } from './announce.dto';
import { SpecialCaseService } from '../special';

@Injectable()
export class AnnounceHandlerService {
  private readonly logger = new Logger(AnnounceHandlerService.name);

  constructor (
    private readonly specialCaseService: SpecialCaseService,
    private readonly serialService: SerialService,
    @InjectModel(ANNOUNCE_MODEL) private announce: Model<Announce>,
    @Inject(TRANSPORT_SERVICE) private readonly client: ClientProxy,
  ) {}

  async checkAlreadyExist (announce: AnnounceDto, serial: Serial): Promise<boolean> {
    /**
     * TODO: migration of news db
     *       Was: array of series.num and series.studio
     *       Become: plain series and studio (1 for each announce)
     * */
    const existing = await this.announce
      .findOne()
      .where('season', announce.season)
      .where('name', announce.name)
      .where('series', announce.series)
      .where('studio', announce.studio)
      .exec();

    return !!existing;
  }

  private async save (announce: AnnounceDto, serial: Serial): Promise<void> {
    const result = new this.announce();

    /* TODO: use class-tranformer */
    Object.assign(result, classToPlain(announce));
    result.serial = serial._id;

    await result.save();
  }

  public async process (announces: AnnounceDto[]): Promise<void> {
    for (const announce of announces) {
      const errors = await validate(announce);
      if (errors.length > 0) {
        this.logger.warn('Bad announce');
        this.logger.warn(announce);

        continue;
      }

      announce.name = await this.specialCaseService.check(announce.name, announce.studio);

      let serial = await this.serialService.findExact(announce.name);
      if (!serial) {
        if (announce.url && announce.parse) {
          try {
            serial = await announce.parse(announce.url, true);
          } catch (e) {
            this.logger.error('Не смог распарсить сериал');
            this.logger.error(e);
          }
        }

        if (!serial) {
          this.logger.log(`Сериалa ${announce.name} еще нет в базе, пропускаем...`);
          continue;
        }
      }

      if (
        !this.serialService.hadSeason(serial, announce.season) &&
        announce.url &&
        announce.parse
      ) {
        let tmp: Serial;

        try {
          tmp = await announce.parse(announce.url, false);
        } catch (e) {
          this.logger.error('Не смог распарсить сезон');
          this.logger.error(e);
        }

        if (tmp) {
          this.logger.log(`Добавляем ${tmp.season[0].name} сериалу ${serial.name}`);
          await this.serialService.addSeason(serial, tmp.season[0]);
        }
      }

      if (await this.checkAlreadyExist(announce, serial)) {
        continue;
      }

      await this.serialService.addVoiceoverIfNew(serial, announce.studio);
      await this.save(announce, serial);

      await this.client
        .emit<void>('received_announce', {
          id: serial._id,
          name: announce.name,
          season: announce.season,
          series: announce.series,
          voiceover: announce.studio,
        })
        .toPromise();
    }
  }
}
