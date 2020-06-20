import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ParserService } from './parser.service';
import { ParserController } from './parser.controller';
import { AnnounceHandlerModule } from '../handler';
import {
  BaibakoTransformer,
  ColdfilmTransformer,
  KubikTransformer,
  KurajTransformer,
  LostfilmTransformer,
} from './transformers';

@Module({
  imports: [AnnounceHandlerModule, ConfigModule],
  providers: [
    ParserService,
    BaibakoTransformer,
    ColdfilmTransformer,
    KubikTransformer,
    KurajTransformer,
    LostfilmTransformer,
  ],
  controllers: [ParserController],
})
export class ParserModule {}
