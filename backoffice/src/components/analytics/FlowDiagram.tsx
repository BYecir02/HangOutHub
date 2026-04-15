import { memo, useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';

import EmptyState from '../EmptyState';

import '@xyflow/react/dist/style.css';

interface FlowTreeBucket {
  label: string;
  value: number;
}

interface FlowTreeNode {
  id: string;
  label: string;
  value?: number | string;
  hint?: string;
  children?: FlowTreeNode[];
}

interface FlowTreeSummary {
  totalEvents: number;
  uniqueSessions: number;
  uniqueUsers: number;
  screenViews: number;
  actionEvents: number;
}

interface FlowDiagramProps {
  windowLabel: string;
  summary: FlowTreeSummary;
  tree: FlowTreeNode;
  topScreens: FlowTreeBucket[];
  topActions: FlowTreeBucket[];
}

type FlowNodeTone = 'brand' | 'emerald' | 'amber' | 'slate' | 'rose';
type FlowNodeKind = 'root' | 'screen' | 'action';

interface FlowNodeData extends Record<string, unknown> {
  label: string;
  hint?: string;
  value?: number | string;
  tone: FlowNodeTone;
  kind: FlowNodeKind;
}

const NODE_WIDTH = 256;
const NODE_HEIGHT = 138;
const COLUMN_STEP = 294;
const ROW_STEP = 198;

function formatCount(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

function summaryToneClass(tone: FlowNodeTone) {
  switch (tone) {
    case 'brand':
      return 'border-brand-200 bg-gradient-to-br from-brand-50 via-white to-slate-50 dark:border-brand-500/30 dark:from-brand-950/30 dark:via-slate-950 dark:to-brand-950/10';
    case 'emerald':
      return 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-slate-50 dark:border-emerald-500/30 dark:from-emerald-950/30 dark:via-slate-950 dark:to-emerald-950/10';
    case 'amber':
      return 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-slate-50 dark:border-amber-500/30 dark:from-amber-950/30 dark:via-slate-950 dark:to-amber-950/10';
    case 'rose':
      return 'border-rose-200 bg-gradient-to-br from-rose-50 via-white to-slate-50 dark:border-rose-500/30 dark:from-rose-950/30 dark:via-slate-950 dark:to-rose-950/10';
    case 'slate':
    default:
      return 'border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100/70 dark:border-slate-700 dark:from-slate-900/80 dark:via-slate-950 dark:to-slate-900/30';
  }
}

function summaryAccentClass(tone: FlowNodeTone) {
  switch (tone) {
    case 'brand':
      return 'bg-brand-500';
    case 'emerald':
      return 'bg-emerald-500';
    case 'amber':
      return 'bg-amber-500';
    case 'rose':
      return 'bg-rose-500';
    case 'slate':
    default:
      return 'bg-slate-500';
  }
}

function edgeColorForKind(kind: FlowNodeKind) {
  switch (kind) {
    case 'root':
      return '#2563eb';
    case 'action':
      return '#f59e0b';
    case 'screen':
    default:
      return '#0f766e';
  }
}

function flowKindForNode(node: FlowTreeNode, depth: number): FlowNodeKind {
  if (depth === 0) {
    return 'root';
  }

  return node.label.toLowerCase() === 'actions' ? 'action' : 'screen';
}

function flowToneForNode(node: FlowTreeNode, depth: number): FlowNodeTone {
  const kind = flowKindForNode(node, depth);
  if (kind === 'root') {
    return 'brand';
  }

  if (kind === 'action') {
    return 'amber';
  }

  return depth % 2 === 0 ? 'emerald' : 'slate';
}

const FlowCardNode = memo(function FlowCardNode({
  data,
  selected,
}: NodeProps<Node<FlowNodeData>>) {
  const toneClass = summaryToneClass(data.tone);
  const selectedClass = selected ? 'ring-2 ring-brand-300 shadow-xl shadow-brand-500/10' : 'shadow-[0_14px_40px_rgba(15,23,42,0.08)]';
  const metricLabel =
    data.kind === 'root' ? 'Sessions' : data.kind === 'action' ? 'Count' : 'Visits';

  return (
    <div
      className={`relative flex h-full flex-col rounded-3xl border p-4 backdrop-blur-sm transition ${toneClass} ${selectedClass}`}
      style={{ width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-white !bg-brand-500"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
            {data.kind === 'root' ? 'Root' : data.kind === 'action' ? 'Action branch' : 'Screen'}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {data.label}
          </p>
          {data.hint ? (
            <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
              {data.hint}
            </p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white ${summaryAccentClass(data.tone)}`}
        >
          {metricLabel}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
            Value
          </p>
          <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {typeof data.value === 'number' ? formatCount(data.value) : data.value ?? '0'}
          </p>
        </div>
        <div className="h-10 w-10 rounded-2xl border border-white/60 bg-white/70 shadow-inner dark:border-slate-700 dark:bg-slate-950/70" />
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-400"
      />
    </div>
  );
});

function countLeaves(node: FlowTreeNode): number {
  if (!node.children || node.children.length === 0) {
    return 1;
  }

  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

function buildGraph(root: FlowTreeNode) {
  const nodes: Node<FlowNodeData>[] = [];
  const edges: Edge[] = [];

  const walk = (node: FlowTreeNode, depth: number, leftLeaf: number) => {
    const leaves = countLeaves(node);
    const centerLeaf = leftLeaf + leaves / 2;
    const kind = flowKindForNode(node, depth);
    const tone = flowToneForNode(node, depth);
    const x = centerLeaf * COLUMN_STEP - NODE_WIDTH / 2;
    const y = depth * ROW_STEP;

    nodes.push({
      id: node.id,
      type: 'flowCard',
      position: { x, y },
      data: {
        label: node.label,
        hint: node.hint,
        value: node.value,
        tone,
        kind,
      },
    });

    let cursor = leftLeaf;
    for (const child of node.children || []) {
      const childLeaves = countLeaves(child);
      const childKind = flowKindForNode(child, depth + 1);
      const childColor = edgeColorForKind(childKind);

      edges.push({
        id: `${node.id}::${child.id}`,
        source: node.id,
        target: child.id,
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: childColor,
        },
        style: {
          stroke: childColor,
          strokeWidth: 2,
        },
      });

      walk(child, depth + 1, cursor);
      cursor += childLeaves;
    }
  };

  walk(root, 0, 0);

  return {
    nodes,
    edges,
  };
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: FlowNodeTone;
}) {
  return (
    <div className={`rounded-2xl border border-slate-100 p-4 shadow-soft dark:border-slate-800 ${summaryToneClass(tone)}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-slate-100">
        {formatCount(value)}
      </p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

function RankedList({
  title,
  subtitle,
  items,
  emptyTitle,
  emptySubtitle,
  accent,
}: {
  title: string;
  subtitle: string;
  items: FlowTreeBucket[];
  emptyTitle: string;
  emptySubtitle: string;
  accent: FlowNodeTone;
}) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-gray-950">
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const width = Math.max(8, Math.round((item.value / maxValue) * 100));

            return (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {item.label}
                  </p>
                  <p className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {formatCount(item.value)}
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${summaryAccentClass(accent)}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FlowDiagram({
  windowLabel,
  summary,
  tree,
  topScreens,
  topActions,
}: FlowDiagramProps) {
  const { nodes, edges } = useMemo(() => buildGraph(tree), [tree]);
  const graphKey = useMemo(() => {
    const screenSignature = topScreens
      .map((item) => `${item.label}:${item.value}`)
      .join('|');
    const actionSignature = topActions
      .map((item) => `${item.label}:${item.value}`)
      .join('|');

    return [
      tree.id,
      summary.totalEvents,
      summary.uniqueSessions,
      summary.uniqueUsers,
      summary.screenViews,
      summary.actionEvents,
      screenSignature,
      actionSignature,
    ].join('::');
  }, [
    summary.actionEvents,
    summary.screenViews,
    summary.totalEvents,
    summary.uniqueSessions,
    summary.uniqueUsers,
    topActions,
    topScreens,
    tree.id,
  ]);
  const nodeTypes = useMemo(() => ({ flowCard: FlowCardNode }), []);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Sessions" value={summary.uniqueSessions} hint={`Sur ${windowLabel}`} tone="brand" />
        <SummaryCard label="Utilisateurs" value={summary.uniqueUsers} hint="Utilisateurs uniques" tone="slate" />
        <SummaryCard label="Vues ecran" value={summary.screenViews} hint="Navigations observees" tone="emerald" />
        <SummaryCard label="Actions" value={summary.actionEvents} hint="Interactions declenchees" tone="amber" />
        <SummaryCard label="Evenements" value={summary.totalEvents} hint="Total en base" tone="rose" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Arbre de navigation
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Le frontend mobile alimente ce diagramme. Tu peux zoomer, bouger et lire les branches les plus actives sur {windowLabel}.
              </p>
            </div>
            <div className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-200">
              {formatCount(summary.totalEvents)} events
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[1.6rem] border border-slate-100 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.08),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.95))] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_42%),linear-gradient(180deg,rgba(2,6,23,0.95),rgba(15,23,42,0.95))]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span>Diagramme React Flow</span>
              <span>Drag, zoom, inspect</span>
            </div>

            <div className="h-[72vh] min-h-[640px]">
              {nodes.length > 0 ? (
                <ReactFlow
                  key={graphKey}
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  fitView
                  minZoom={0.18}
                  maxZoom={1.35}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  proOptions={{ hideAttribution: true }}
                  defaultEdgeOptions={{
                    type: 'smoothstep',
                  }}
                  fitViewOptions={{ padding: 0.22 }}
                  className="bg-transparent"
                >
                  <MiniMap
                    position="bottom-left"
                    nodeColor={(node) => {
                      const data = node.data as FlowNodeData | undefined;
                      return data ? edgeColorForKind(data.kind) : '#94a3b8';
                    }}
                    nodeStrokeWidth={3}
                    zoomable
                    pannable
                  />
                  <Controls position="bottom-right" />
                  <Background variant={BackgroundVariant.Dots} gap={20} size={1.1} color="#cbd5e1" />
                </ReactFlow>
              ) : (
                <div className="flex h-full items-center justify-center p-6">
                  <EmptyState
                    title="Aucune donnee de parcours."
                    subtitle="Le diagramme se remplit des qu un utilisateur navigue dans le frontend."
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <RankedList
            title="Top screens"
            subtitle="Les ecrans les plus visites."
            items={topScreens}
            emptyTitle="Aucun ecran."
            emptySubtitle="Aucune visite enregistree sur la periode."
            accent="brand"
          />
          <RankedList
            title="Top actions"
            subtitle="Les actions les plus declenchees."
            items={topActions}
            emptyTitle="Aucune action."
            emptySubtitle="Aucune interaction enregistree sur la periode."
            accent="amber"
          />
        </div>
      </div>
    </div>
  );
}
