import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import {
  AdminAnalyticsFlowTreeResponse,
  AnalyticsFlowTreeNode,
  DashboardBucket,
  DashboardTrendRange,
  DashboardTrendWindow,
  FlowTreeSummary,
} from './analytics.types';

type FlowWindowInput = {
  range?: DashboardTrendRange;
  from?: string;
  to?: string;
};

type ResolvedFlowWindow = {
  window: DashboardTrendWindow;
  start: Date;
  end: Date;
};

type FlowEventRow = {
  id: string;
  userId: string | null;
  distinctId: string;
  sessionId: string;
  eventName: string;
  screenKey: string | null;
  screenName: string | null;
  path: string | null;
  previousScreenKey: string | null;
  previousPath: string | null;
  actionName: string | null;
  entityType: string | null;
  entityId: string | null;
  platform: string | null;
  appVersion: string | null;
  buildChannel: string | null;
  locale: string | null;
  metadata: unknown;
  createdAt: Date;
};

type NodeStats = {
  visits: number;
  sessions: Set<string>;
  users: Set<string>;
};

type ActionStats = {
  count: number;
  sessions: Set<string>;
  users: Set<string>;
};

const ROOT_KEY = '__root__';
const MAX_TREE_DEPTH = 5;

@Injectable()
export class UserFlowAnalyticsService {
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

  private formatWindowLabel(start: Date, end: Date) {
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const inclusiveEnd = this.addDays(end, -1);
    return `Du ${formatter.format(start)} au ${formatter.format(inclusiveEnd)}`;
  }

  private resolveWindow(input: FlowWindowInput): ResolvedFlowWindow {
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

  private normalizeSegment(segment: string) {
    return segment
      .replace(/[-_]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .replace(/(^|\s)\S/g, (match) => match.toUpperCase());
  }

  private isDynamicSegment(segment: string) {
    if (!segment) {
      return false;
    }

    const normalized = segment.replace(/^:+/, '');
    return (
      /^\[.*\]$/.test(segment) ||
      /^\d+$/.test(normalized) ||
      /^[0-9a-f]{8,}$/i.test(normalized) ||
      normalized.length >= 24
    );
  }

  private normalizeScreenKey(value?: string | null) {
    if (!value) {
      return ROOT_KEY;
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed === '/') {
      return 'home';
    }

    const segments = trimmed
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)
      .filter((segment) => !segment.startsWith('(') && !segment.endsWith(')'))
      .filter((segment) => segment !== 'tabs' && segment !== 'stack');

    const normalized = segments
      .map((segment) => {
        if (this.isDynamicSegment(segment)) {
          return ':id';
        }

        return segment.toLowerCase();
      })
      .filter(Boolean);

    if (normalized.length === 0) {
      return 'home';
    }

    if (normalized.length === 1 && normalized[0] === 'index') {
      return 'home';
    }

    return normalized.join('/');
  }

  private screenLabelFromKey(screenKey: string) {
    if (!screenKey || screenKey === ROOT_KEY) {
      return 'Entry';
    }

    const segments = screenKey
      .split('/')
      .filter(Boolean)
      .filter((segment) => segment !== ':id');

    if (segments.length === 0) {
      return 'Detail';
    }

    if (segments.length === 1) {
      if (segments[0] === 'home') {
        return 'Home';
      }

      return this.normalizeSegment(segments[0]);
    }

    return segments.map((segment) => this.normalizeSegment(segment)).join(' / ');
  }

  private actionLabelFromKey(actionKey: string) {
    return this.normalizeSegment(actionKey.replace(/_/g, ' '));
  }

  private ensureNodeStats(map: Map<string, NodeStats>, key: string) {
    const existing = map.get(key);
    if (existing) {
      return existing;
    }

    const next: NodeStats = {
      visits: 0,
      sessions: new Set<string>(),
      users: new Set<string>(),
    };
    map.set(key, next);
    return next;
  }

  private ensureActionStats(map: Map<string, ActionStats>, key: string) {
    const existing = map.get(key);
    if (existing) {
      return existing;
    }

    const next: ActionStats = {
      count: 0,
      sessions: new Set<string>(),
      users: new Set<string>(),
    };
    map.set(key, next);
    return next;
  }

  private isMissingUserFlowEventTableError(error: unknown) {
    const prismaError = error as {
      code?: string;
      message?: string;
      meta?: { code?: string; message?: string };
    };

    return (
      prismaError?.code === 'P2010' &&
      (prismaError?.meta?.code === '42P01' ||
        prismaError?.message?.includes('UserFlowEvent') ||
        prismaError?.meta?.message?.includes('UserFlowEvent'))
    );
  }

  async recordEvent(
    input: {
      eventName: string;
      screenKey?: string | null;
      screenName?: string | null;
      path?: string | null;
      previousScreenKey?: string | null;
      previousPath?: string | null;
      actionName?: string | null;
      entityType?: string | null;
      entityId?: string | null;
      distinctId?: string | null;
      sessionId?: string | null;
      platform?: string | null;
      appVersion?: string | null;
      buildChannel?: string | null;
      locale?: string | null;
      metadata?: Record<string, unknown> | null;
    },
    actor: { userId?: string | null; role?: string | null } | null = null,
  ) {
    const screenKey = this.normalizeScreenKey(input.screenKey || input.path);
    const previousScreenKey = this.normalizeScreenKey(
      input.previousScreenKey || input.previousPath,
    );
    const screenName = input.screenName || this.screenLabelFromKey(screenKey);
    const actionName = input.actionName || null;
    const distinctId = input.distinctId || input.sessionId || 'anonymous';
    const sessionId = input.sessionId || distinctId;
    const metadata = JSON.stringify(input.metadata ?? null);

    const insertEvent = async () => {
      await this.prisma.$executeRawUnsafe(
        `
        INSERT INTO "UserFlowEvent" (
          id,
          "distinctId",
          "sessionId",
          "userId",
          "eventName",
          "actionName",
          "screenKey",
          "screenName",
          "path",
          "previousScreenKey",
          "previousPath",
          "entityType",
          "entityId",
          "platform",
          "appVersion",
          "buildChannel",
          "locale",
          "metadata",
          "createdAt"
        ) VALUES (
          uuid_generate_v4(),
          $1,
          $2,
          $3::uuid,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          $17::jsonb,
          NOW()
        )
      `,
        distinctId,
        sessionId,
        actor?.userId ?? null,
        input.eventName,
        actionName,
        screenKey,
        screenName,
        input.path ?? null,
        previousScreenKey === ROOT_KEY ? null : previousScreenKey,
        input.previousPath ?? null,
        input.entityType ?? null,
        input.entityId ?? null,
        input.platform ?? null,
        input.appVersion ?? null,
        input.buildChannel ?? null,
        input.locale ?? null,
        metadata,
      );
    };

    try {
      await insertEvent();
    } catch (error) {
      if (this.isMissingUserFlowEventTableError(error)) {
        await this.prisma.ensureUserFlowEventCompatibility();
        await insertEvent();
      } else {
        throw error;
      }
    }

    return {
      accepted: true,
    };
  }

  async getFlowTree(input: FlowWindowInput = {}): Promise<AdminAnalyticsFlowTreeResponse> {
    const resolvedWindow = this.resolveWindow(input);
    const { window, start, end } = resolvedWindow;

    const rows = await this.prisma.$queryRawUnsafe<FlowEventRow[]>(
      `
      SELECT
        id,
        "userId",
        "distinctId",
        "sessionId",
        "eventName",
        "screenKey",
        "screenName",
        "path",
        "previousScreenKey",
        "previousPath",
        "actionName",
        "entityType",
        "entityId",
        "platform",
        "appVersion",
        "buildChannel",
        "locale",
        metadata,
        "createdAt"
      FROM "UserFlowEvent"
      WHERE "createdAt" >= $1
        AND "createdAt" < $2
      ORDER BY "createdAt" ASC
    `,
      start,
      end,
    );

    const screenStats = new Map<string, NodeStats>();
    const transitionStats = new Map<string, Map<string, NodeStats>>();
    const actionStats = new Map<string, Map<string, ActionStats>>();
    const topScreenAccumulator = new Map<string, NodeStats>();
    const topActionAccumulator = new Map<string, ActionStats>();
    const uniqueSessions = new Set<string>();
    const uniqueUsers = new Set<string>();

    for (const row of rows) {
      const actorKey = row.userId || row.distinctId;
      const screenKey = this.normalizeScreenKey(row.screenKey || row.path || row.eventName);
      const previousScreenKey =
        this.normalizeScreenKey(row.previousScreenKey || row.previousPath) || ROOT_KEY;
      const eventName = row.eventName || 'screen_view';
      const isScreenView = eventName === 'screen_view';

      uniqueSessions.add(row.sessionId);
      uniqueUsers.add(actorKey);

      if (isScreenView) {
        const screenNode = this.ensureNodeStats(screenStats, screenKey);
        screenNode.visits += 1;
        screenNode.sessions.add(row.sessionId);
        screenNode.users.add(actorKey);

        const topScreenNode = this.ensureNodeStats(topScreenAccumulator, screenKey);
        topScreenNode.visits += 1;
        topScreenNode.sessions.add(row.sessionId);
        topScreenNode.users.add(actorKey);

        const parentMap = transitionStats.get(previousScreenKey) || new Map<string, NodeStats>();
        transitionStats.set(previousScreenKey, parentMap);
        const transitionNode = this.ensureNodeStats(parentMap, screenKey);
        transitionNode.visits += 1;
        transitionNode.sessions.add(row.sessionId);
        transitionNode.users.add(actorKey);
      } else {
        const actionKey = row.actionName || eventName;
        const actionMap = actionStats.get(screenKey) || new Map<string, ActionStats>();
        actionStats.set(screenKey, actionMap);
        const actionNode = this.ensureActionStats(actionMap, actionKey);
        actionNode.count += 1;
        actionNode.sessions.add(row.sessionId);
        actionNode.users.add(actorKey);

        const topActionNode = this.ensureActionStats(topActionAccumulator, actionKey);
        topActionNode.count += 1;
        topActionNode.sessions.add(row.sessionId);
        topActionNode.users.add(actorKey);
      }
    }

    const summary: FlowTreeSummary = {
      totalEvents: rows.length,
      uniqueSessions: uniqueSessions.size,
      uniqueUsers: uniqueUsers.size,
      screenViews: Array.from(screenStats.values()).reduce((sum, item) => sum + item.visits, 0),
      actionEvents: Array.from(topActionAccumulator.values()).reduce(
        (sum, item) => sum + item.count,
        0,
      ),
    };

    const topScreens = Array.from(topScreenAccumulator.entries())
      .map<DashboardBucket>(([label, stats]) => ({
        label: this.screenLabelFromKey(label),
        value: stats.visits,
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 5);

    const topActions = Array.from(topActionAccumulator.entries())
      .map<DashboardBucket>(([label, stats]) => ({
        label: this.actionLabelFromKey(label),
        value: stats.count,
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 5);

    const buildActionsBranch = (screenKey: string): AnalyticsFlowTreeNode | null => {
      const actionMap = actionStats.get(screenKey);
      if (!actionMap || actionMap.size === 0) {
        return null;
      }

      const actionNodes = Array.from(actionMap.entries())
        .map<AnalyticsFlowTreeNode>(([actionKey, stats]) => ({
          id: `${screenKey}::action::${actionKey}`,
          label: this.actionLabelFromKey(actionKey),
          value: stats.count,
          hint: `${stats.users.size} user${stats.users.size > 1 ? 's' : ''} | ${
            stats.sessions.size
          } session${stats.sessions.size > 1 ? 's' : ''}`,
        }))
        .sort((left, right) => Number(right.value || 0) - Number(left.value || 0));

      const actionVisits = actionNodes.reduce(
        (sum, node) => sum + Number(node.value || 0),
        0,
      );

      return {
        id: `${screenKey}::actions`,
        label: 'Actions',
        value: actionVisits,
        hint: `${actionNodes.length} action${actionNodes.length > 1 ? 's' : ''}`,
        children: actionNodes,
      };
    };

    const buildChildren = (
      parentKey: string,
      parentId: string,
      depth: number,
      ancestors: Set<string>,
    ): AnalyticsFlowTreeNode[] => {
      if (depth >= MAX_TREE_DEPTH) {
        return [];
      }

      const transitionMap = transitionStats.get(parentKey);
      if (!transitionMap || transitionMap.size === 0) {
        const actionsBranch = buildActionsBranch(parentKey);
        return actionsBranch ? [actionsBranch] : [];
      }

      const orderedTransitions = Array.from(transitionMap.entries())
        .map(([childKey, stats]) => ({
          childKey,
          stats,
        }))
        .filter(({ childKey }) => childKey !== parentKey && !ancestors.has(childKey))
        .sort((left, right) => right.stats.visits - left.stats.visits);

      const nodes = orderedTransitions.map<AnalyticsFlowTreeNode>(({ childKey, stats }) => {
        const childId = `${parentId}::${childKey}`;
        const childAncestors = new Set(ancestors);
        childAncestors.add(parentKey);

        const descendants = buildChildren(childKey, childId, depth + 1, childAncestors);
        const actionsBranch = buildActionsBranch(childKey);
        const children = [
          ...descendants,
          ...(actionsBranch ? [actionsBranch] : []),
        ];

        return {
          id: childId,
          label: this.screenLabelFromKey(childKey),
          value: stats.visits,
          hint: `${stats.users.size} user${stats.users.size > 1 ? 's' : ''} | ${
            stats.sessions.size
          } session${stats.sessions.size > 1 ? 's' : ''}`,
          children: children.length > 0 ? children : undefined,
        };
      });

      const actionsBranch = buildActionsBranch(parentKey);
      if (actionsBranch) {
        nodes.push(actionsBranch);
      }

      return nodes;
    };

    const rootChildren = buildChildren(ROOT_KEY, 'root', 0, new Set<string>());

    const tree: AnalyticsFlowTreeNode = {
      id: 'root',
      label: 'User flow',
      value: summary.uniqueSessions,
      hint: `${summary.uniqueUsers} user${summary.uniqueUsers > 1 ? 's' : ''} | ${
        summary.screenViews
      } screen view${summary.screenViews > 1 ? 's' : ''} | ${
        summary.actionEvents
      } action${summary.actionEvents > 1 ? 's' : ''}`,
      children:
        rootChildren.length > 0
          ? rootChildren
          : [
              {
                id: 'root-empty',
                label: 'No data',
                value: 0,
                hint: 'Capture navigation events to populate the tree.',
              },
            ],
    };

    return {
      window,
      summary,
      tree,
      topScreens,
      topActions,
    };
  }
}


