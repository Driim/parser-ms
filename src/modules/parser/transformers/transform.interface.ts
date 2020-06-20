import Parser from 'rss-parser';
import { AnnounceDto } from '../../handler';

export interface TransformInterface {
  url: string;
  loginUrl?: string;
  transform: (data: Parser.Item) => AnnounceDto;
}
