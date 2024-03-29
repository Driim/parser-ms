import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Model } from 'mongoose';
import escapeRegexpString from 'escape-string-regexp';
import { Serial, Season, Subscription } from '../../interfaces';
import { SERIAL_MODEL, SUBSCRIPTION_MODEL } from '../../constants.app';

@Injectable()
export class SerialService {
  private readonly logger = new Logger(SerialService.name);

  constructor (
    @InjectSentry() private readonly sentry: SentryService,
    @InjectModel(SERIAL_MODEL) private serial: Model<Serial>,
    @InjectModel(SUBSCRIPTION_MODEL) private subscription: Model<Subscription>
  ) {}

  async findExact (name: string): Promise<Serial> {
    const regexp = new RegExp(`^${escapeRegexpString(name)}$`, 'i');
    const serials = await this.serial.find()
      .or([
        { name: regexp },
        { alias: regexp }
      ])
      .exec();
    if (serials.length > 1) {
      this.logger.error(`По запросу ${name} было найдено больше 1 сериала`);
      this.logger.error(JSON.stringify(serials));
      this.sentry.instance().captureMessage(`По запросу ${name} было найдено больше 1 сериала`);

      return null;
    }

    if (serials.length == 0) {
      return null;
    }

    return serials[0];
  }

  async addVoiceoverIfNew (serial: Serial, voiceover: string): Promise<void> {
    if (voiceover && !serial.voiceover.includes(voiceover)) {
      this.logger.log(`Добавляем озвучку ${voiceover} сериалу ${serial.name}`);
      serial.voiceover.push(voiceover);
      await serial.save();
    }
  }

  public hadSeason (serial: Serial, seasonName: string): boolean {
    return serial.season.some((season) => season.name == seasonName);
  }

  async addSeason (serial: Serial, season: Season): Promise<Serial> {
    if (season && !this.hadSeason(serial, season.name)) {
      serial.season.push(season);
    }

    return serial.save();
  }

  async addNewSerial (serial: Serial): Promise<Serial> {
    serial = await serial.save();

    /** Create subscription model */
    const subs = new this.subscription();
    subs.serial = serial._id;
    subs.fans = [];
    await subs.save();
    
    return serial;
  }

  async save (serial: Serial): Promise<Serial> {
    return serial.save();
  }
}
