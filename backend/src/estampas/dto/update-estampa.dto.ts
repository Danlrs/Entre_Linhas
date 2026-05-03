import { PartialType } from '@nestjs/mapped-types';
import { CreateEstampaDto } from './create-estampa.dto';

export class UpdateEstampaDto extends PartialType(CreateEstampaDto) {}
