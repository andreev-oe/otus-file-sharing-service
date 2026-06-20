import {
  Inject,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type Redis from 'ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { Subscription } from 'rxjs';
import { EventBus } from '../../infrastructure/events/event-bus';
import type { CascadePermissionsToFoldersEvent } from '../../infrastructure/events/cascade-permissions-to-folders.event';
import { PermissionChangeAction } from '../../infrastructure/events/permission-changed-on-folder.event';
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
const EVERYONE_SUBJECT_ID = 'everyone';

function isPermissionLevel(value: string): value is PermissionLevel {
  return Object.values<string>(PermissionLevel).includes(value);
}

@Injectable()
export class PermissionsService implements OnModuleInit, OnModuleDestroy {
  private folderCreatedSubscription: Subscription;
  private fileCreatedSubscription: Subscription;
  private cascadePermissionsSubscription: Subscription;

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly eventBus: EventBus,
  ) {}

  onModuleInit() {
    this.folderCreatedSubscription = this.eventBus.folderCreated.subscribe(
      async (event) => {
        await this.upsertPermission(
          SubjectType.USER,
          event.ownerId,
          ResourceType.FOLDER,
          event.folderId,
          PermissionLevel.MANAGE,
        );
        if (event.parentId) {
          await this.inheritFromParent(event.parentId, event.folderId);
        }
      },
    );
    this.fileCreatedSubscription = this.eventBus.fileCreated.subscribe(
      async (event) => {
        await this.upsertPermission(
          SubjectType.USER,
          event.ownerId,
          ResourceType.FILE,
          event.fileId,
          PermissionLevel.MANAGE,
        );
      },
    );
    this.cascadePermissionsSubscription =
      this.eventBus.cascadePermissionsToFolders.subscribe(async (event) => {
        await this.applyCascade(event);
      });
  }

  onModuleDestroy() {
    this.folderCreatedSubscription.unsubscribe();
    this.fileCreatedSubscription.unsubscribe();
    this.cascadePermissionsSubscription.unsubscribe();
  }

  async grant(dto: CreatePermissionDto): Promise<Permission> {
    const subjectId =
      dto.subjectType === SubjectType.EVERYONE
        ? EVERYONE_SUBJECT_ID
        : (dto.subjectId ?? '');
    const result = await this.upsertPermission(
      dto.subjectType,
      subjectId,
      dto.resourceType,
      dto.resourceId,
      dto.permission,
    );

    if (dto.resourceType === ResourceType.FOLDER) {
      this.eventBus.permissionChangedOnFolder.next({
        action: PermissionChangeAction.GRANT,
        folderId: dto.resourceId,
        subjectType: dto.subjectType,
        subjectId,
        permissionLevel: dto.permission,
      });
    }

    return result;
  }

  async revoke(id: string): Promise<void> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    await this.permissionRepository.delete(id);
    await this.invalidateResourceCache(
      permission.resourceType,
      permission.resourceId,
    );

    if (permission.resourceType === ResourceType.FOLDER) {
      this.eventBus.permissionChangedOnFolder.next({
        action: PermissionChangeAction.REVOKE,
        folderId: permission.resourceId,
        subjectType: permission.subjectType,
        subjectId: permission.subjectId,
      });
    }
  }

  async check(
    userId: string,
    groupIds: string[],
    resourceType: ResourceType,
    resourceId: string,
    required: PermissionLevel,
  ): Promise<boolean> {
    const highestLevel = await this.resolveHighestLevel(
      userId,
      groupIds,
      resourceType,
      resourceId,
    );
    if (!highestLevel) {
      return false;
    }
    return (
      PERMISSION_LEVEL_ORDER[highestLevel] >= PERMISSION_LEVEL_ORDER[required]
    );
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
        return (
          PERMISSION_LEVEL_ORDER[cached] >= PERMISSION_LEVEL_ORDER[required]
        );
      }
    }

    const memberships = await this.groupMemberRepository.find({
      where: { userId },
      select: { groupId: true },
    });
    const groupIds = memberships.map((membership) => {
      return membership.groupId;
    });
    const highestLevel = await this.resolveHighestLevel(
      userId,
      groupIds,
      resourceType,
      resourceId,
    );

    await this.redis.set(
      cacheKey,
      highestLevel ?? CACHED_NONE,
      'EX',
      PERMISSION_CACHE_TTL_SECONDS,
    );

    if (!highestLevel) {
      return false;
    }
    return (
      PERMISSION_LEVEL_ORDER[highestLevel] >= PERMISSION_LEVEL_ORDER[required]
    );
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
          qb.orWhere('permission.subjectType = :everyoneType', {
            everyoneType: SubjectType.EVERYONE,
          });
        }),
      );

    const permissions = await queryBuilder.getMany();
    if (permissions.length === 0) {
      return null;
    }

    return permissions.reduce((best, current) => {
      return PERMISSION_LEVEL_ORDER[current.permission] >
        PERMISSION_LEVEL_ORDER[best]
        ? current.permission
        : best;
    }, permissions[0].permission);
  }

  private async upsertPermission(
    subjectType: SubjectType,
    subjectId: string,
    resourceType: ResourceType,
    resourceId: string,
    permissionLevel: PermissionLevel,
  ): Promise<Permission> {
    const existing = await this.permissionRepository.findOne({
      where: { subjectType, subjectId, resourceType, resourceId },
    });

    if (existing) {
      existing.permission = permissionLevel;
      const result = await this.permissionRepository.save(existing);
      await this.invalidateResourceCache(resourceType, resourceId);
      return result;
    }

    const result = await this.permissionRepository.save(
      this.permissionRepository.create({
        subjectType,
        subjectId,
        resourceType,
        resourceId,
        permission: permissionLevel,
      }),
    );
    await this.invalidateResourceCache(resourceType, resourceId);
    return result;
  }

  private async deletePermissionBySubject(
    subjectType: SubjectType,
    subjectId: string,
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<void> {
    const permission = await this.permissionRepository.findOne({
      where: { subjectType, subjectId, resourceType, resourceId },
    });
    if (!permission) {
      return;
    }
    await this.permissionRepository.delete(permission.id);
    await this.invalidateResourceCache(resourceType, resourceId);
  }

  private async applyCascade(
    event: CascadePermissionsToFoldersEvent,
  ): Promise<void> {
    for (const folderId of event.folderIds) {
      if (
        event.action === PermissionChangeAction.GRANT &&
        event.permissionLevel
      ) {
        await this.upsertPermission(
          event.subjectType,
          event.subjectId,
          ResourceType.FOLDER,
          folderId,
          event.permissionLevel,
        );
      } else if (event.action === PermissionChangeAction.REVOKE) {
        await this.deletePermissionBySubject(
          event.subjectType,
          event.subjectId,
          ResourceType.FOLDER,
          folderId,
        );
      }
    }
  }

  private async inheritFromParent(
    parentFolderId: string,
    childFolderId: string,
  ): Promise<void> {
    const parentPermissions = await this.permissionRepository.find({
      where: { resourceType: ResourceType.FOLDER, resourceId: parentFolderId },
    });

    for (const permission of parentPermissions) {
      await this.permissionRepository.save(
        this.permissionRepository.create({
          subjectType: permission.subjectType,
          subjectId: permission.subjectId,
          resourceType: ResourceType.FOLDER,
          resourceId: childFolderId,
          permission: permission.permission,
        }),
      );
    }
  }

  private async invalidateResourceCache(
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<void> {
    const pattern = `${PERMISSION_CACHE_KEY_PREFIX}${resourceType}:${resourceId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
