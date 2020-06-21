import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ParserService } from './parser.service';
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
})
export class ParserModule {}
