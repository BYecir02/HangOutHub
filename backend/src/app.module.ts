import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { EventsModule } from './events/events.module';
import { PlacesModule } from './places/places.module';
import { PostsModule } from './posts/posts.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CommentsModule } from './comments/comments.module';
import { StorageModule } from './storage/storage.module';
import { OutingsModule } from './outings/outings.module';
import { FriendshipsModule } from './friendships/friendships.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrganizerScannerModule } from './organizer-scanner/organizer-scanner.module';
import { CitiesModule } from './cities/cities.module';
import { DirectChatsModule } from './direct-chats/direct-chats.module';
import { ReportsModule } from './reports/reports.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'), // Utilise process.cwd() pour être sûr de pointer sur la racine du projet
      serveRoot: '/uploads', // Rend les fichiers accessibles via http://ip:3000/uploads/...
    }),
    UsersModule,
    PrismaModule,
    StorageModule,
    AuthModule,
    CategoriesModule,
    EventsModule,
    PlacesModule,
    PostsModule,
    CitiesModule,
    CommentsModule,
    OutingsModule,
    FriendshipsModule,
    DirectChatsModule,
    NotificationsModule,
    OrganizerScannerModule,
    ReportsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
