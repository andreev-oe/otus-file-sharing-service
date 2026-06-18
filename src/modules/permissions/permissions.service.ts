import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { PermissionLevel, ResourceType, SubjectType } from '../../common/enums';

const PERMISSION_LEVEL_ORDER: Record<PermissionLevel, number> = {
  [PermissionLevel.VIEW]: 0,
  [PermissionLevel.COMMENT]: 1,
  [PermissionLevel.EDIT]: 2,
  [PermissionLevel.MANAGE]: 3,
};

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async grant(dto: CreatePermissionDto): Promise<Permission> {
    const existing = await this.permissionRepository.findOne({
      where: {
        subjectType: dto.subjectType,
        subjectId: dto.subjectId,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
      },
    });

    if (existing) {
      existing.permission = dto.permission;
      return this.permissionRepository.save(existing);
    }

    return this.permissionRepository.save(this.permissionRepository.create(dto));
  }

  async revoke(id: string): Promise<void> {
    const permission = await this.permissionRepository.findOne({ where: { id } });
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    await this.permissionRepository.delete(id);
  }

  async check(
    userId: string,
    groupIds: string[],
    resourceType: ResourceType,
    resourceId: string,
    required: PermissionLevel,
  ): Promise<boolean> {
    const queryBuilder = this.permissionRepository
      .createQueryBuilder('permission')
      .where('permission.resourceType = :resourceType', { resourceType })
      .andWhere('permission.resourceId = :resourceId', { resourceId })
      .andWhere(
        new Brackets((qb) => {
          qb.where(
            'permission.subjectType = :userType AND permission.subjectId = :userId',
            { userType: SubjectType.USER, userId },
          );
          if (groupIds.length > 0) {
            qb.orWhere(
              'permission.subjectType = :groupType AND permission.subjectId IN (:...groupIds)',
              { groupType: SubjectType.GROUP, groupIds },
            );
          }
        }),
      );

    const permissions = await queryBuilder.getMany();
    if (permissions.length === 0) {
      return false;
    }

    const highestLevel = permissions.reduce((best, current) => {
      return PERMISSION_LEVEL_ORDER[current.permission] > PERMISSION_LEVEL_ORDER[best]
        ? current.permission
        : best;
    }, permissions[0].permission);

    return PERMISSION_LEVEL_ORDER[highestLevel] >= PERMISSION_LEVEL_ORDER[required];
  }
}
