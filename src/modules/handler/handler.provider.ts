import { validate } from 'class-validator';
import { classToPlain } from 'class-transformer';
import { Model } from 'mongoose';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { ANNOUNCE_MODEL, TRANSPORT_SERVICE } from '../../constants.app';
import { Serial, Announce } from '../../interfaces';
import { SerialService } from '../serial';
import { AnnounceDto } from './announce.dto';
import { SpecialCaseService } from '../special';
import uniqWith from 'lodash.uniqwith';

interface INewSeason {
  announce: AnnounceDto;
  serial: Serial;
}

@Injectable()
export class AnnounceHandlerService {
  private readonly logger = new Logger(AnnounceHandlerService.name);

  constructor (
    private readonly specialCaseService: SpecialCaseService,
    private readonly serialService: SerialService,
    @InjectSentry() private readonly sentry: SentryService,
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
      .where('serial', serial._id)
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

  /**
   * Check if serial exists and announce is new
   * All new announces for existing serials will fanout
   * @param announces - list of announces
   * @returns list of announces for new serials and list of announces with new seasons
   */
  public async process (
    announces: AnnounceDto[],
  ): Promise<{ newSerials: AnnounceDto[]; newSeasons: INewSeason[] }> {
    const newSerials: Array<AnnounceDto> = [];
    const newSeasons: Array<INewSeason> = [];

    for (const announce of announces) {
      const errors = await validate(announce);
      if (errors.length > 0) {
        this.logger.warn('Bad announce');
        this.logger.warn(announce);
        this.logger.error(errors);
        this.sentry.instance().captureException(errors);

        continue;
      }

      announce.name = await this.specialCaseService.check(announce.name, announce.studio);

      const serial = await this.serialService.findExact(announce.name);
      if (!serial) {
        this.logger.log(`Сериалa ${announce.name} еще нет в базе, пропускаем...`);
        newSerials.push(announce);
        continue;
      }

      if (!this.serialService.hadSeason(serial, announce.season)) {
        this.logger.log(`Сезона ${announce.season} сериала ${announce.name} еще нет в базе...`);
        newSeasons.push({ announce, serial });
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

    /** remove not uniq new serials and seasons */
    return {
      newSerials: uniqWith(newSerials, (a: AnnounceDto, b: AnnounceDto) => a.name === b.name),
      newSeasons: uniqWith(newSeasons, (a: INewSeason, b: INewSeason) => a.announce.name === b.announce.name && a.announce.season === b.announce.season)
    };
  }
}
