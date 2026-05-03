import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../entities/material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@Injectable()
export class MateriaisService {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
  ) {}

  findAll(): Promise<Material[]> {
    return this.materialRepository.find({ order: { nome: 'ASC' } });
  }

  async findOne(id: number): Promise<Material> {
    const material = await this.materialRepository.findOne({ where: { id } });
    if (!material) throw new NotFoundException('Material não encontrado.');
    return material;
  }

  create(dto: CreateMaterialDto): Promise<Material> {
    const material = this.materialRepository.create(dto);
    return this.materialRepository.save(material);
  }

  async update(id: number, dto: UpdateMaterialDto): Promise<Material> {
    const material = await this.findOne(id);
    Object.assign(material, dto);
    return this.materialRepository.save(material);
  }

  async remove(id: number): Promise<{ message: string }> {
    const material = await this.findOne(id);
    await this.materialRepository.remove(material);
    return { message: 'Material removido com sucesso.' };
  }
}
