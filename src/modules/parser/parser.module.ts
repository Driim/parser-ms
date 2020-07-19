import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ParserService } from './parser.service';
import { AnnounceHandlerModule } from '../handler';
import {
  BaibakoProducer,
  ColdfilmProducer,
  KubikProducer,
  KurajProducer,
  LostfilmProducer,
  SeasonvarProducer,
} from './producers';
import { SerialModule } from '../serial/serial.module';
import { MongooseModule } from '@nestjs/mongoose';
import { SERIAL_MODEL } from 'src/constants.app';
import { SerialSchema } from 'src/schemas';

@Module({
  imports: [
    AnnounceHandlerModule,
    ConfigModule,
    SerialModule,
    MongooseModule.forFeature([{ name: SERIAL_MODEL, schema: SerialSchema }]),
  ],
  providers: [
    ParserService,
    BaibakoProducer,
    ColdfilmProducer,
    KubikProducer,
    KurajProducer,
    LostfilmProducer,
    SeasonvarProducer,
  ],
})
export class ParserModule {}
