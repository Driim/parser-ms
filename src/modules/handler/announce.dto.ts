import { IsDate, IsNotEmpty, IsString, IsOptional, IsUrl } from 'class-validator';
import { Exclude } from 'class-transformer';
import { Serial } from '../../interfaces';

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
  parse?: (url: string, follow: boolean) => Promise<Serial>;
}
