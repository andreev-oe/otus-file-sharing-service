import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { GroupDto } from './dto/group.dto';
import { GroupMemberDto } from './dto/group-member.dto';

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить список групп (все — для admin, свои — для остальных)' })
  @ApiOkResponse({ type: [GroupDto] })
  async findAll(@CurrentUser() user: User): Promise<GroupDto[]> {
    const groups = await this.groupsService.findAll(user.id, user.role);
    return groups.map((group) => {
      return GroupDto.fromEntity(group);
    });
  }

  @Post()
  @ApiOperation({ summary: 'Создать новую группу пользователей' })
  @ApiCreatedResponse({ type: GroupDto })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateGroupDto,
  ): Promise<GroupDto> {
    const group = await this.groupsService.create(user.id, dto);
    return GroupDto.fromEntity(group);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить группу по ID' })
  @ApiOkResponse({ type: GroupDto })
  async findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GroupDto> {
    const group = await this.groupsService.findById(id, user.id, user.role);
    return GroupDto.fromEntity(group);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Добавить участника в группу с указанием роли' })
  @ApiCreatedResponse({ type: GroupMemberDto })
  async addMember(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
  ): Promise<GroupMemberDto> {
    const member = await this.groupsService.addMember(id, user.id, dto);
    return GroupMemberDto.fromEntity(member);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить группу (только owner или системный admin)' })
  @ApiNoContentResponse({ description: 'Группа удалена' })
  delete(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.groupsService.delete(id, user.id, user.role);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить участника из группы' })
  @ApiNoContentResponse({ description: 'Участник удалён' })
  removeMember(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    return this.groupsService.removeMember(id, user.id, userId);
  }

  @Patch(':id/transfer-ownership')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Передать роль owner другому участнику группы' })
  @ApiNoContentResponse({ description: 'Владелец изменён' })
  transferOwnership(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferOwnershipDto,
  ): Promise<void> {
    return this.groupsService.transferOwnership(id, user.id, dto.newOwnerId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Получить список участников группы' })
  @ApiOkResponse({ type: [GroupMemberDto] })
  async getMembers(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GroupMemberDto[]> {
    const members = await this.groupsService.getMembers(id);
    return members.map((member) => {
      return GroupMemberDto.fromEntity(member);
    });
  }
}
