import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { SpecialCaseService } from './special.provider';
import { ALIAS_MODEL } from '../../constants.app';
import { SpecialCaseSchema } from '../../schemas';

@Module({
  imports: [MongooseModule.forFeature([{ name: ALIAS_MODEL, schema: SpecialCaseSchema }])],
  providers: [SpecialCaseService],
  exports: [SpecialCaseService],
})
export class SpecialCaseModule {}
