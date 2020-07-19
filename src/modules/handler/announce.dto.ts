import { IsDate, IsNotEmpty, IsString, IsOptional, IsUrl, IsObject } from 'class-validator';
import { Exclude } from 'class-transformer';
import { AnnounceProducer } from '../parser/producers';

export class AnnounceDto {
  @IsDate()
  @IsNotEmpty()
  date: Date;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  series: string;

  @IsString()
  @IsNotEmpty()
  season: string;

  @IsString()
  @IsOptional()
  studio?: string;

  @IsUrl()
  @IsOptional()
  @Exclude({ toPlainOnly: true })
  url?: string;

  @Exclude({ toPlainOnly: true })
  @IsOptional()
  @IsObject()
  producer?: AnnounceProducer;
}
