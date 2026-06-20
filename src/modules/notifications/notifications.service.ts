import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Subscription } from 'rxjs';
import { EventBus } from '../../infrastructure/events/event-bus';
import { MailService } from '../../infrastructure/mail/mail.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private usersMentionedSubscription: Subscription;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventBus: EventBus,
    private readonly mailService: MailService,
  ) {}

  onModuleInit() {
    this.usersMentionedSubscription = this.eventBus.usersMentioned.subscribe(
      async (event) => {
        await this.handleUsersMentioned(
          event.mentionedUsernames,
          event.authorId,
          event.noteId,
        );
      },
    );
  }

  onModuleDestroy() {
    this.usersMentionedSubscription.unsubscribe();
  }

  private async handleUsersMentioned(
    mentionedUsernames: string[],
    authorId: string,
    noteId: string,
  ): Promise<void> {
    if (mentionedUsernames.length === 0) {
      return;
    }

    const [mentionedUsers, author] = await Promise.all([
      this.userRepository.find({
        where: { username: In(mentionedUsernames) },
        select: { id: true, email: true, name: true },
      }),
      this.userRepository.findOne({
        where: { id: authorId },
        select: { name: true },
      }),
    ]);

    if (!author) {
      return;
    }

    for (const user of mentionedUsers) {
      if (user.id !== authorId) {
        await this.mailService.sendMentionNotification(
          user.email,
          user.name,
          author.name,
          noteId,
        );
      }
    }
  }
}
