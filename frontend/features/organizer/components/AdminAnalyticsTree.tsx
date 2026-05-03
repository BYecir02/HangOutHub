import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type AdminAnalyticsTreeTone =
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'slate'
  | 'violet';

export interface AdminAnalyticsTreeNode {
  id: string;
  label: string;
  value?: number | string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: AdminAnalyticsTreeTone;
  children?: AdminAnalyticsTreeNode[];
}

type ToneStyles = {
  container: string;
  value: string;
  border: string;
  icon: string;
};

const TONE_STYLES: Record<AdminAnalyticsTreeTone, ToneStyles> = {
  blue: {
    container: 'bg-[#4c669f]/10 dark:bg-[#4c669f]/20',
    value: 'text-[#4c669f] dark:text-[#9bb4e6]',
    border: 'border-[#4c669f]/15 dark:border-[#4c669f]/30',
    icon: '#4c669f',
  },
  emerald: {
    container: 'bg-emerald-100 dark:bg-emerald-900/30',
    value: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: '#059669',
  },
  amber: {
    container: 'bg-amber-100 dark:bg-amber-900/30',
    value: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    icon: '#d97706',
  },
  rose: {
    container: 'bg-rose-100 dark:bg-rose-900/30',
    value: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    icon: '#e11d48',
  },
  slate: {
    container: 'bg-gray-100 dark:bg-gray-800',
    value: 'text-gray-700 dark:text-gray-200',
    border: 'border-gray-200 dark:border-gray-700',
    icon: '#64748b',
  },
  violet: {
    container: 'bg-violet-100 dark:bg-violet-900/30',
    value: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
    icon: '#7c3aed',
  },
};

function formatNodeValue(value: number | string | undefined, locale: string) {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'number') {
    return new Intl.NumberFormat(locale).format(value);
  }

  return value;
}

function TreeNode({
  node,
  depth,
  locale,
}: {
  node: AdminAnalyticsTreeNode;
  depth: number;
  locale: string;
}) {
  const tone = TONE_STYLES[node.tone || 'blue'];
  const hasChildren = Boolean(node.children?.length);

  return (
    <View
      className={
        depth === 0
          ? ''
          : 'ml-4 border-l border-dashed border-gray-200 pl-4 dark:border-gray-700'
      }
    >
      <View
        className={`rounded-[26px] border bg-white p-4 shadow-sm dark:bg-gray-900 ${tone.border} ${
          depth === 0 ? 'shadow-md' : ''
        }`}
      >
        <View className="flex-row items-start gap-3">
          <View className={`h-11 w-11 items-center justify-center rounded-2xl ${tone.container}`}>
            <Ionicons
              name={node.icon || 'analytics-outline'}
              size={18}
              color={tone.icon}
            />
          </View>
          <View className="flex-1">
            <View className="flex-row items-start justify-between gap-3">
              <Text
                className={`flex-1 font-semibold text-gray-900 dark:text-white ${
                  depth === 0 ? 'text-base' : 'text-sm'
                }`}
              >
                {node.label}
              </Text>
              {node.value !== undefined ? (
                <Text className={`text-sm font-bold ${tone.value}`}>
                  {formatNodeValue(node.value, locale)}
                </Text>
              ) : null}
            </View>
            {node.hint ? (
              <Text className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                {node.hint}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {hasChildren ? (
        <View className="mt-3">
          {node.children?.map((child) => (
            <View key={child.id} className="mt-3">
              <TreeNode node={child} depth={depth + 1} locale={locale} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function AdminAnalyticsTree({
  root,
  locale,
}: {
  root: AdminAnalyticsTreeNode;
  locale: string;
}) {
  return <TreeNode node={root} depth={0} locale={locale} />;
}
