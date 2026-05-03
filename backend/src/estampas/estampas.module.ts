import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstampasController } from './estampas.controller';
import { EstampasService } from './estampas.service';
import { Estampa } from '../entities/estampa.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Estampa]),
  ],
  controllers: [EstampasController],
  providers: [EstampasService],
  exports: [EstampasService],
})
export class EstampasModule {}
