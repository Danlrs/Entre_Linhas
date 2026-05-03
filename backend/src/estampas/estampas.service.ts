import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estampa } from '../entities/estampa.entity';
import { CreateEstampaDto } from './dto/create-estampa.dto';
import { UpdateEstampaDto } from './dto/update-estampa.dto';

@Injectable()
export class EstampasService {
  constructor(
    @InjectRepository(Estampa)
    private readonly estampaRepository: Repository<Estampa>,
  ) {}

  findAll(): Promise<Estampa[]> {
    return this.estampaRepository.find({ order: { nome: 'ASC' } });
  }

  async findOne(id: number): Promise<Estampa> {
    const estampa = await this.estampaRepository.findOne({ where: { id } });
    if (!estampa) throw new NotFoundException('Estampa não encontrada.');
    return estampa;
  }

  create(dto: CreateEstampaDto): Promise<Estampa> {
    const estampa = this.estampaRepository.create(dto);
    return this.estampaRepository.save(estampa);
  }

  async update(id: number, dto: UpdateEstampaDto): Promise<Estampa> {
    const estampa = await this.findOne(id);
    Object.assign(estampa, dto);
    return this.estampaRepository.save(estampa);
  }

  async remove(id: number): Promise<{ message: string }> {
    const estampa = await this.findOne(id);
    await this.estampaRepository.remove(estampa);
    return { message: 'Estampa removida com sucesso.' };
  }
}
