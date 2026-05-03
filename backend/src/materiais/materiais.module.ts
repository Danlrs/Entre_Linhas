import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MateriaisController } from './materiais.controller';
import { MateriaisService } from './materiais.service';
import { Material } from '../entities/material.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Material]),
  ],
  controllers: [MateriaisController],
  providers: [MateriaisService],
  exports: [MateriaisService],
})
export class MateriaisModule {}
