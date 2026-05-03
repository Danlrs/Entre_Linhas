import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { EstampasService } from './estampas.service';
import { CreateEstampaDto } from './dto/create-estampa.dto';
import { UpdateEstampaDto } from './dto/update-estampa.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('estampas')
export class EstampasController {
  constructor(private readonly estampasService: EstampasService) {}

  @Get()
  findAll() {
    return this.estampasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.estampasService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateEstampaDto) {
    return this.estampasService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEstampaDto) {
    return this.estampasService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.estampasService.remove(id);
  }
}
