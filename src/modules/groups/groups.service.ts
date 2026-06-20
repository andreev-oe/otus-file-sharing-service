import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupMemberRole } from '../../common/enums';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { AddMemberDto } from './dto/add-member.dto';

const MANAGER_ROLES = new Set([GroupMemberRole.OWNER, GroupMemberRole.ADMIN]);

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
  ) {}

  async create(ownerId: string, dto: CreateGroupDto): Promise<Group> {
    const group = this.groupRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      ownerId,
    });
    const savedGroup = await this.groupRepository.save(group);

    const ownerMember = this.groupMemberRepository.create({
      groupId: savedGroup.id,
      userId: ownerId,
      role: GroupMemberRole.OWNER,
    });
    await this.groupMemberRepository.save(ownerMember);

    return savedGroup;
  }

  async addMember(
    groupId: string,
    requesterId: string,
    dto: AddMemberDto,
  ): Promise<GroupMember> {
    await this.verifyManagerAccess(groupId, requesterId);

    const existing = await this.groupMemberRepository.findOne({
      where: { groupId, userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this group');
    }

    const member = this.groupMemberRepository.create({
      groupId,
      userId: dto.userId,
      role: dto.role,
    });
    return this.groupMemberRepository.save(member);
  }

  async removeMember(
    groupId: string,
    requesterId: string,
    userId: string,
  ): Promise<void> {
    await this.verifyManagerAccess(groupId, requesterId);

    const member = await this.groupMemberRepository.findOne({
      where: { groupId, userId },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === GroupMemberRole.OWNER) {
      if (requesterId !== userId) {
        throw new ForbiddenException(
          'Only the owner can remove themselves from the group',
        );
      }
      await this.promoteOldestAdminToOwner(groupId);
    }

    await this.groupMemberRepository.delete(member.id);
  }

  async transferOwnership(
    groupId: string,
    requesterId: string,
    newOwnerId: string,
  ): Promise<void> {
    const requesterMember = await this.groupMemberRepository.findOne({
      where: { groupId, userId: requesterId },
    });
    if (!requesterMember || requesterMember.role !== GroupMemberRole.OWNER) {
      throw new ForbiddenException(
        'Only the group owner can transfer ownership',
      );
    }

    if (requesterId === newOwnerId) {
      throw new ForbiddenException('Cannot transfer ownership to yourself');
    }

    const newOwnerMember = await this.groupMemberRepository.findOne({
      where: { groupId, userId: newOwnerId },
    });
    if (!newOwnerMember) {
      throw new NotFoundException('New owner is not a member of this group');
    }

    await this.groupMemberRepository.update(requesterMember.id, {
      role: GroupMemberRole.ADMIN,
    });
    await this.groupMemberRepository.update(newOwnerMember.id, {
      role: GroupMemberRole.OWNER,
    });
    await this.groupRepository.update(groupId, { ownerId: newOwnerId });
  }

  async getMembers(groupId: string): Promise<GroupMember[]> {
    return this.groupMemberRepository.find({
      where: { groupId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }

  private async verifyManagerAccess(
    groupId: string,
    userId: string,
  ): Promise<void> {
    const member = await this.groupMemberRepository.findOne({
      where: { groupId, userId },
    });
    if (!member || !MANAGER_ROLES.has(member.role)) {
      throw new ForbiddenException(
        'Only group owners and admins can manage members',
      );
    }
  }

  private async promoteOldestAdminToOwner(groupId: string): Promise<void> {
    const adminToPromote = await this.groupMemberRepository.findOne({
      where: { groupId, role: GroupMemberRole.ADMIN },
      order: { createdAt: 'ASC' },
    });
    if (!adminToPromote) {
      throw new ForbiddenException(
        'Cannot leave the group: no admin to promote. Transfer ownership first.',
      );
    }
    await this.groupMemberRepository.update(adminToPromote.id, {
      role: GroupMemberRole.OWNER,
    });
    await this.groupRepository.update(groupId, {
      ownerId: adminToPromote.userId,
    });
  }
}
