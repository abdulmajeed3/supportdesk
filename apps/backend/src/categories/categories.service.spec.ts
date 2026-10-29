import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  ticketCategory: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(CategoriesService);
  });

  describe('create', () => {
    it('throws ConflictException when name already exists', async () => {
      mockPrisma.ticketCategory.findUnique.mockResolvedValue({ id: '1', name: 'Existing' });
      await expect(service.create({ name: 'Existing' })).rejects.toThrow(ConflictException);
    });

    it('creates category when name is unique', async () => {
      mockPrisma.ticketCategory.findUnique.mockResolvedValue(null);
      mockPrisma.ticketCategory.create.mockResolvedValue({ id: '1', name: 'New Category', isActive: true });
      const result = await service.create({ name: 'New Category' });
      expect(result.name).toBe('New Category');
    });
  });

  describe('findAll', () => {
    it('returns all categories when activeOnly is false', async () => {
      mockPrisma.ticketCategory.findMany.mockResolvedValue([
        { id: '1', name: 'Active', isActive: true },
        { id: '2', name: 'Inactive', isActive: false },
      ]);
      const result = await service.findAll(false);
      expect(result).toHaveLength(2);
      expect(mockPrisma.ticketCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('filters active categories when activeOnly is true', async () => {
      mockPrisma.ticketCategory.findMany.mockResolvedValue([{ id: '1', name: 'Active', isActive: true }]);
      await service.findAll(true);
      expect(mockPrisma.ticketCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when category does not exist', async () => {
      mockPrisma.ticketCategory.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent-id', { name: 'New Name' })).rejects.toThrow(NotFoundException);
    });
  });
});
