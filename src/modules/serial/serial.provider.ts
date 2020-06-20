import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Serial, Season } from '../../interfaces';
import { SERIAL_MODEL } from '../../constants.app';

@Injectable()
export class SerialService {
  private readonly logger = new Logger(SerialService.name);

  constructor (@InjectModel(SERIAL_MODEL) private serial: Model<Serial>) {}

  async findExact (name: string): Promise<Serial> {
    return this.serial.findOne({ name }).exec();
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
}
