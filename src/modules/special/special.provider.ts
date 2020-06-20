import { Model } from 'mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ALIAS_MODEL } from '../../constants.app';
import { Special } from '../../interfaces';

@Injectable()
export class SpecialCaseService {
  private readonly logger = new Logger(SpecialCaseService.name);

  constructor (@InjectModel(ALIAS_MODEL) private special: Model<Special>) {}

  /**
   * Check serial had some special alias
   * @param name
   * @param studio
   */
  public async check (name: string, studio: string): Promise<string> {
    const result = await this.special.findOne({ name, studio });

    if (result) {
      this.logger.log(`Serial ${name} from ${studio} has alias ${result.alias}`);
    }

    return result?.alias ?? name;
  }
}
