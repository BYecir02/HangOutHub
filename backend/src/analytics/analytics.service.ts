import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import {
  AdminAnalyticsDashboardResponse,
  DashboardAlertItem,
  DashboardBucket,
  DashboardComparisonMetric,
  DashboardModerationItem,
  DashboardRecentEvent,
  DashboardRecentReport,
  DashboardRecentUser,
  DashboardTrendPoint,
  DashboardTrendRange,
  DashboardTrendWindow,
} from './analytics.types';

type CountSeriesSource = {
  table: string;
  dateColumn: string;
  whereClause?: string;
};

type DashboardWindowInput = {
  range?: DashboardTrendRange;
  from?: string;
  to?: string;
};

type ResolvedDashboardWindow = {
  window: DashboardTrendWindow;
  start: Date;
  end: Date;
};

type WindowMetricCounts = {
  users: number;
  events: number;
  places: number;
  reports: number;
  shares: number;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private startOfDay(date: Date) {
    const clone = new Date(date);
    clone.setHours(0, 0, 0, 0);
    return clone;
  }

  private startOfWeek(date: Date) {
    const clone = this.startOfDay(date);
    const day = clone.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    clone.setDate(clone.getDate() + diff);
    return clone;
  }

  private addDays(date: Date, days: number) {
    const clone = new Date(date);
    clone.setDate(clone.getDate() + days);
    return clone;
  }

  private addWeeks(date: Date, weeks: number) {
    return this.addDays(date, weeks * 7);
  }

  private diffInDays(start: Date, end: Date) {
    return Math.max(
      1,
      Math.ceil((this.startOfDay(end).getTime() - this.startOfDay(start).getTime()) / 86400000),
    );
  }

  private diffInWeeks(start: Date, end: Date) {
    return Math.max(
      1,
      Math.ceil(
        (this.startOfWeek(end).getTime() - this.startOfWeek(start).getTime()) /
          (7 * 86400000),
      ),
    );
  }

  private parseDateInput(value?: string) {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatBucketKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private formatBucketLabel(date: Date) {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  }

  private formatWindowLabel(start: Date, end: Date) {
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const inclusiveEnd = this.addDays(end, -1);
    return `Du ${formatter.format(start)} au ${formatter.format(inclusiveEnd)}`;
  }

  private resolveWindow(input: DashboardWindowInput): ResolvedDashboardWindow {
    const now = new Date();
    const today = this.startOfDay(now);

    if (input.range === 'week') {
      const start = this.addDays(today, -6);
      const end = this.addDays(today, 1);
      return {
        start,
        end,
        window: {
          range: 'week',
          label: '7 derniers jours',
          start: start.toISOString(),
          end: end.toISOString(),
          granularity: 'day',
          points: 7,
        },
      };
    }

    if (input.range === 'quarter') {
      const currentWeek = this.startOfWeek(now);
      const start = this.addWeeks(currentWeek, -11);
      const end = this.addWeeks(currentWeek, 1);
      return {
        start,
        end,
        window: {
          range: 'quarter',
          label: '12 dernieres semaines',
          start: start.toISOString(),
          end: end.toISOString(),
          granularity: 'week',
          points: 12,
        },
      };
    }

    if (input.range === 'custom') {
      const parsedFrom = this.parseDateInput(input.from) || this.addDays(today, -29);
      const parsedTo = this.parseDateInput(input.to) || today;
      const rangeStart = parsedFrom <= parsedTo ? parsedFrom : parsedTo;
      const rangeEnd = parsedFrom <= parsedTo ? parsedTo : parsedFrom;
      const startDay = this.startOfDay(rangeStart);
      const endDay = this.addDays(this.startOfDay(rangeEnd), 1);
      const spanDays = this.diffInDays(startDay, endDay);

      if (spanDays <= 45) {
        return {
          start: startDay,
          end: endDay,
          window: {
            range: 'custom',
            label: this.formatWindowLabel(startDay, endDay),
            start: startDay.toISOString(),
            end: endDay.toISOString(),
            granularity: 'day',
            points: spanDays,
          },
        };
      }

      const weekStart = this.startOfWeek(startDay);
      const weekEnd = this.addWeeks(this.startOfWeek(rangeEnd), 1);

      return {
        start: weekStart,
        end: weekEnd,
        window: {
          range: 'custom',
          label: this.formatWindowLabel(weekStart, weekEnd),
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
          granularity: 'week',
          points: this.diffInWeeks(weekStart, weekEnd),
        },
      };
    }

    const start = this.addDays(today, -29);
    const end = this.addDays(today, 1);
    return {
      start,
      end,
      window: {
        range: 'month',
        label: '30 derniers jours',
        start: start.toISOString(),
        end: end.toISOString(),
        granularity: 'day',
        points: 30,
      },
    };
  }

  private buildComparisonMetric(
    current: number,
    previous: number,
    label: string,
  ): DashboardComparisonMetric {
    const delta = current - previous;
    const trend: DashboardComparisonMetric['trend'] =
      delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    const deltaPercent =
      previous > 0 ? Number((((delta / previous) * 100)).toFixed(1)) : null;

    return {
      current,
      previous,
      delta,
      deltaPercent,
      trend,
      label,
    };
  }

  private async countBetween(
    table: string,
    dateColumn: string,
    start: Date,
    end: Date,
    whereClause = '',
  ) {
    const rows = await this.prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `
      SELECT COUNT(*)::int AS count
      FROM "${table}"
      WHERE "${dateColumn}" >= $1
        AND "${dateColumn}" < $2
        ${whereClause}
    `,
      start,
      end,
    );

    return Number(rows[0]?.count || 0);
  }

  private async getWindowMetricCounts(start: Date, end: Date): Promise<WindowMetricCounts> {
    const [users, events, places, reports, shares] = await Promise.all([
      this.countBetween('User', 'createdAt', start, end),
      this.countBetween('EventRevision', 'createdAt', start, end, `AND action = 'CREATE'`),
      this.countBetween('Place', 'createdAt', start, end),
      this.countBetween('Report', 'createdAt', start, end),
      this.countBetween('PostShareEvent', 'createdAt', start, end),
    ]);

    return { users, events, places, reports, shares };
  }

  private buildAlerts(
    currentCounts: WindowMetricCounts,
    previousCounts: WindowMetricCounts,
    summary: { pendingReports: number; pendingOrganizerProfiles: number; suspendedUsers: number },
  ): DashboardAlertItem[] {
    const alerts: DashboardAlertItem[] = [];

    if (summary.pendingReports > 0) {
      alerts.push({
        severity: summary.pendingReports > 5 ? 'high' : 'medium',
        title: `${summary.pendingReports} signalement${summary.pendingReports > 1 ? 's' : ''} en attente`,
        subtitle: 'La moderation a des contenus a traiter.',
        href: '/reports',
      });
    }

    if (summary.pendingOrganizerProfiles > 0) {
      alerts.push({
        severity: summary.pendingOrganizerProfiles > 5 ? 'high' : 'medium',
        title: `${summary.pendingOrganizerProfiles} dossier${summary.pendingOrganizerProfiles > 1 ? 's' : ''} organisateur${summary.pendingOrganizerProfiles > 1 ? 's' : ''} a verifier`,
        subtitle: 'Des profils professionnels attendent une validation.',
        href: '/approvals',
      });
    }

    const reportDelta = currentCounts.reports - previousCounts.reports;
    if (currentCounts.reports > 0 && reportDelta > 0 && reportDelta / Math.max(previousCounts.reports, 1) >= 0.5) {
      alerts.push({
        severity: 'medium',
        title: 'Hausse des signalements sur la periode',
        subtitle: 'Le volume de signalements progresse plus vite que sur la periode precedente.',
        href: '/reports',
      });
    }

    if (summary.suspendedUsers > 0 && alerts.length < 3) {
      alerts.push({
        severity: 'low',
        title: `${summary.suspendedUsers} utilisateur${summary.suspendedUsers > 1 ? 's' : ''} suspendu${summary.suspendedUsers > 1 ? 's' : ''}`,
        subtitle: 'Un point de suivi rapide peut etre utile.',
        href: '/users',
      });
    }

    return alerts.slice(0, 3);
  }

  private async getCountSeriesMap(
    source: CountSeriesSource,
    granularity: 'day' | 'week',
    start: Date,
    end: Date,
  ) {
    const whereClause = source.whereClause ? `AND ${source.whereClause}` : '';
    const rows = await this.prisma.$queryRawUnsafe<Array<{ bucket: Date; count: number }>>(
      `
      SELECT date_trunc('${granularity}', "${source.dateColumn}") AS bucket,
             COUNT(*)::int AS count
      FROM "${source.table}"
      WHERE "${source.dateColumn}" >= $1
        AND "${source.dateColumn}" < $2
        ${whereClause}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
      start,
      end,
    );

    return new Map(rows.map((row) => [this.formatBucketKey(new Date(row.bucket)), Number(row.count)]));
  }

  private buildTrendSeries(
    start: Date,
    points: number,
    granularity: 'day' | 'week',
    seriesMaps: Record<string, Map<string, number>>,
  ): DashboardTrendPoint[] {
    const output: DashboardTrendPoint[] = [];

    for (let index = 0; index < points; index += 1) {
      const current = granularity === 'day' ? this.addDays(start, index) : this.addWeeks(start, index);
      const key = this.formatBucketKey(current);

      output.push({
        label: this.formatBucketLabel(current),
        users: seriesMaps.users.get(key) ?? 0,
        events: seriesMaps.events.get(key) ?? 0,
        places: seriesMaps.places.get(key) ?? 0,
        reports: seriesMaps.reports.get(key) ?? 0,
        shares: seriesMaps.shares.get(key) ?? 0,
      });
    }

    return output;
  }

  private async getRecentEvents(): Promise<DashboardRecentEvent[]> {
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        createdAt: Date;
        startTime: Date;
        endTime: Date | null;
        placeName: string | null;
        cityName: string | null;
      }>
    >(
      `
      SELECT e.id,
             e.title,
             COALESCE(er."createdAt", e."startTime") AS "createdAt",
             e."startTime",
             e."endTime",
             p.name AS "placeName",
             c.name AS "cityName"
      FROM "Event" e
      LEFT JOIN LATERAL (
        SELECT "createdAt"
        FROM "EventRevision"
        WHERE "eventId" = e.id
          AND action = 'CREATE'
        ORDER BY "createdAt" ASC
        LIMIT 1
      ) er ON true
      LEFT JOIN "Place" p ON p.id = e."placeId"
      LEFT JOIN "City" c ON c.id = p."cityId"
      ORDER BY COALESCE(er."createdAt", e."startTime") DESC
      LIMIT 5
    `,
    );

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.createdAt.toISOString(),
      startTime: row.startTime.toISOString(),
      endTime: row.endTime ? row.endTime.toISOString() : null,
      placeName: row.placeName,
      cityName: row.cityName,
    }));
  }

  private async getRecentReports(): Promise<DashboardRecentReport[]> {
    const rows = await this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        targetType: true,
        reason: true,
        status: true,
        createdAt: true,
        User: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      targetType: row.targetType,
      reason: row.reason,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      reporter: row.User,
    }));
  }

  private async getRecentUsers(): Promise<DashboardRecentUser[]> {
    const rows = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        UserRole: {
          include: {
            Role: true,
          },
        },
        OrganizerProfile: {
          select: {
            status: true,
          },
        },
      },
    });

    return rows.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      role: user.UserRole[0]?.Role?.name || 'USER',
      createdAt: (user.createdAt || new Date()).toISOString(),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      isSuspended: user.isSuspended,
      organizerStatus: user.OrganizerProfile?.status || null,
    }));
  }

  private async getModerationQueue(
    recentReports: DashboardRecentReport[],
  ): Promise<DashboardModerationItem[]> {
    const pendingOrganizerRows = await this.prisma.organizerProfile.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        userId: true,
        companyName: true,
        accountType: true,
        status: true,
        createdAt: true,
        User: {
          select: {
            username: true,
            displayName: true,
          },
        },
      },
    });

    const reportItems = recentReports
      .filter((report) => (report.status || 'PENDING').toUpperCase() === 'PENDING')
      .slice(0, 5)
      .map<DashboardModerationItem>((report) => ({
        id: report.id,
        kind: 'REPORT',
        title: `${report.targetType.toUpperCase()} a verifier`,
        subtitle: report.reason,
        status: report.status || 'PENDING',
        createdAt: report.createdAt,
        href: '/reports',
      }));

    const organizerItems = pendingOrganizerRows.map<DashboardModerationItem>((item) => ({
      id: item.userId,
      kind: 'ORGANIZER',
      title: item.companyName,
      subtitle: `${item.User.displayName || item.User.username} - ${item.accountType}`,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      href: '/approvals',
    }));

    return [...reportItems, ...organizerItems]
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      )
      .slice(0, 8);
  }

  private async getTopShared() {
    const topShared = await this.prisma.post.findMany({
      where: { shareCount: { gt: 0 } },
      orderBy: { shareCount: 'desc' },
      take: 5,
      select: {
        id: true,
        content: true,
        shareCount: true,
        placeName: true,
        cityName: true,
        createdAt: true,
        User: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        Place: {
          select: {
            id: true,
            name: true,
            City: {
              select: {
                name: true,
              },
            },
          },
        },
        Event: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return topShared.map((post) => ({
      ...post,
      createdAt: post.createdAt ? post.createdAt.toISOString() : null,
    }));
  }

  async getDashboardOverview(input: DashboardWindowInput = {}): Promise<AdminAnalyticsDashboardResponse> {
    const resolvedWindow = this.resolveWindow(input);
    const { window, start, end } = resolvedWindow;
    const windowDuration = end.getTime() - start.getTime();
    const previousEnd = start;
    const previousStart = new Date(start.getTime() - windowDuration);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalEvents,
      totalPlaces,
      totalReports,
      totalSharesResult,
      pendingReports,
      pendingOrganizerProfiles,
      reportsByTypeRows,
      organizerStatusRows,
      usersForRoles,
      recentReports,
      recentUsers,
      recentEvents,
      topShared,
      selectedUsers,
      selectedEvents,
      selectedPlaces,
      selectedReports,
      selectedShares,
      currentCounts,
      previousCounts,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isSuspended: false } }),
      this.prisma.user.count({ where: { isSuspended: true } }),
      this.prisma.event.count(),
      this.prisma.place.count(),
      this.prisma.report.count(),
      this.prisma.post.aggregate({ _sum: { shareCount: true } }),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
      this.prisma.organizerProfile.count({ where: { status: 'PENDING' } }),
      this.prisma.report.groupBy({
        by: ['targetType'],
        _count: { targetType: true },
        orderBy: { targetType: 'asc' },
      }),
      this.prisma.organizerProfile.groupBy({
        by: ['status'],
        _count: { status: true },
        orderBy: { status: 'asc' },
      }),
      this.prisma.user.findMany({
        select: {
          UserRole: {
            include: {
              Role: true,
            },
          },
        },
      }),
      this.getRecentReports(),
      this.getRecentUsers(),
      this.getRecentEvents(),
      this.getTopShared(),
      this.getCountSeriesMap(
        { table: 'User', dateColumn: 'createdAt' },
        window.granularity,
        start,
        end,
      ),
      this.getCountSeriesMap(
        { table: 'EventRevision', dateColumn: 'createdAt', whereClause: `action = 'CREATE'` },
        window.granularity,
        start,
        end,
      ),
      this.getCountSeriesMap(
        { table: 'Place', dateColumn: 'createdAt' },
        window.granularity,
        start,
        end,
      ),
      this.getCountSeriesMap(
        { table: 'Report', dateColumn: 'createdAt' },
        window.granularity,
        start,
        end,
      ),
      this.getCountSeriesMap(
        { table: 'PostShareEvent', dateColumn: 'createdAt' },
        window.granularity,
        start,
        end,
      ),
      this.getWindowMetricCounts(start, end),
      this.getWindowMetricCounts(previousStart, previousEnd),
    ]);

    const selected = this.buildTrendSeries(start, window.points, window.granularity, {
      users: selectedUsers,
      events: selectedEvents,
      places: selectedPlaces,
      reports: selectedReports,
      shares: selectedShares,
    });

    const reportBuckets = reportsByTypeRows.map<DashboardBucket>((row) => ({
      label: row.targetType.toUpperCase(),
      value: Number(row._count.targetType),
    }));

    const organizerBuckets = organizerStatusRows.map<DashboardBucket>((row) => ({
      label: row.status.toUpperCase(),
      value: Number(row._count.status),
    }));

    const roleCounts = usersForRoles.reduce<Record<string, number>>((acc, user) => {
      const role = user.UserRole[0]?.Role?.name || 'USER';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    const roleBuckets = Object.entries(roleCounts)
      .map<DashboardBucket>(([label, value]) => ({
        label,
        value,
      }))
      .sort((left, right) => right.value - left.value);

    const contentMix: DashboardBucket[] = [
      { label: 'Evenements', value: totalEvents },
      { label: 'Lieux', value: totalPlaces },
    ];

    const moderationQueue = await this.getModerationQueue(recentReports);
    const comparisons = {
      users: this.buildComparisonMetric(currentCounts.users, previousCounts.users, 'Nouveaux utilisateurs'),
      events: this.buildComparisonMetric(currentCounts.events, previousCounts.events, 'Nouveaux evenements'),
      places: this.buildComparisonMetric(currentCounts.places, previousCounts.places, 'Nouveaux lieux'),
      reports: this.buildComparisonMetric(currentCounts.reports, previousCounts.reports, 'Nouveaux signalements'),
      shares: this.buildComparisonMetric(currentCounts.shares, previousCounts.shares, 'Nouveaux partages'),
    };
    const alerts = this.buildAlerts(currentCounts, previousCounts, {
      pendingReports,
      pendingOrganizerProfiles,
      suspendedUsers,
    });

    return {
      window: {
        range: window.range,
        label: window.label,
        start: window.start,
        end: window.end,
        granularity: window.granularity,
        points: window.points,
      },
      summary: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        totalEvents,
        totalPlaces,
        totalReports,
        totalShares: Number(totalSharesResult._sum.shareCount || 0),
        pendingReports,
        pendingOrganizerProfiles,
      },
      comparisons,
      alerts,
      trends: {
        selected,
      },
      distributions: {
        reportsByType: reportBuckets,
        userRoles: roleBuckets,
        contentMix,
        organizerStatuses: organizerBuckets,
      },
      recent: {
        reports: recentReports,
        events: recentEvents,
        users: recentUsers,
        moderationQueue,
      },
      topShared,
    };
  }
}
