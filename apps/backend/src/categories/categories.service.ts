import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

export class UpdateCategoryDto extends CreateCategoryDto {}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.ticketCategory.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`Category "${dto.name}" already exists`);

    return this.prisma.ticketCategory.create({ data: { ...dto } });
  }

  async findAll(activeOnly = false) {
    return this.prisma.ticketCategory.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.ticketCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }

  async update(id: string, dto: Partial<CreateCategoryDto>) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.ticketCategory.findUnique({ where: { name: dto.name } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Category name "${dto.name}" is already in use`);
      }
    }

    return this.prisma.ticketCategory.update({ where: { id }, data: { ...dto } });
  }
}
