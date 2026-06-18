import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type Redis from 'ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { REDIS } from '../../infrastructure/cache/redis.provider';
import { Permission } from './entities/permission.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { PermissionLevel, ResourceType, SubjectType } from '../../common/enums';

const PERMISSION_LEVEL_ORDER: Record<PermissionLevel, number> = {
  [PermissionLevel.VIEW]: 0,
  [PermissionLevel.COMMENT]: 1,
  [PermissionLevel.EDIT]: 2,
  [PermissionLevel.MANAGE]: 3,
};

const PERMISSION_CACHE_TTL_SECONDS = 300;
const PERMISSION_CACHE_KEY_PREFIX = 'perm:';
const CACHED_NONE = 'none';

function isPermissionLevel(value: string): value is PermissionLevel {
  return Object.values<string>(PermissionLevel).includes(value);
}

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
    @Inject(REDIS) private readonly redis: Redis,
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

    let result: Permission;
    if (existing) {
      existing.permission = dto.permission;
      result = await this.permissionRepository.save(existing);
    } else {
      result = await this.permissionRepository.save(this.permissionRepository.create(dto));
    }

    await this.invalidateResourceCache(dto.resourceType, dto.resourceId);
    return result;
  }

  async revoke(id: string): Promise<void> {
    const permission = await this.permissionRepository.findOne({ where: { id } });
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    await this.permissionRepository.delete(id);
    await this.invalidateResourceCache(permission.resourceType, permission.resourceId);
  }

  async check(
    userId: string,
    groupIds: string[],
    resourceType: ResourceType,
    resourceId: string,
    required: PermissionLevel,
  ): Promise<boolean> {
    const highestLevel = await this.resolveHighestLevel(userId, groupIds, resourceType, resourceId);
    if (!highestLevel) {
      return false;
    }
    return PERMISSION_LEVEL_ORDER[highestLevel] >= PERMISSION_LEVEL_ORDER[required];
  }

  async checkForUser(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    required: PermissionLevel,
  ): Promise<boolean> {
    const cacheKey = `${PERMISSION_CACHE_KEY_PREFIX}${resourceType}:${resourceId}:${userId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached !== null) {
      if (cached === CACHED_NONE) {
        return false;
      }
      if (isPermissionLevel(cached)) {
        return PERMISSION_LEVEL_ORDER[cached] >= PERMISSION_LEVEL_ORDER[required];
      }
    }

    const memberships = await this.groupMemberRepository.find({
      where: { userId },
      select: { groupId: true },
    });
    const groupIds = memberships.map((membership) => membership.groupId);
    const highestLevel = await this.resolveHighestLevel(userId, groupIds, resourceType, resourceId);

    await this.redis.set(
      cacheKey,
      highestLevel ?? CACHED_NONE,
      'EX',
      PERMISSION_CACHE_TTL_SECONDS,
    );

    if (!highestLevel) {
      return false;
    }
    return PERMISSION_LEVEL_ORDER[highestLevel] >= PERMISSION_LEVEL_ORDER[required];
  }

  private async resolveHighestLevel(
    userId: string,
    groupIds: string[],
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<PermissionLevel | null> {
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
      return null;
    }

    return permissions.reduce((best, current) => {
      return PERMISSION_LEVEL_ORDER[current.permission] > PERMISSION_LEVEL_ORDER[best]
        ? current.permission
        : best;
    }, permissions[0].permission);
  }

  private async invalidateResourceCache(resourceType: ResourceType, resourceId: string): Promise<void> {
    const pattern = `${PERMISSION_CACHE_KEY_PREFIX}${resourceType}:${resourceId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
