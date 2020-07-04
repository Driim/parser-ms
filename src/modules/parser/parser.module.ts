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
  SeasonvarProducer
} from './producers';

@Module({
  imports: [AnnounceHandlerModule, ConfigModule],
  providers: [
    ParserService,
    BaibakoProducer,
    ColdfilmProducer,
    KubikProducer,
    KurajProducer,
    LostfilmProducer,
    SeasonvarProducer
  ],
})
export class ParserModule {}
