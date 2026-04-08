import React, { useMemo, type ReactNode } from 'react';
import { View } from 'react-native';

type MasonryGridItemLayout = {
  y: number;
  height: number;
};

type MasonryGridProps<T> = {
  items: T[];
  getKey: (item: T, index: number) => string;
  estimateItemHeight: (item: T, index: number) => number;
  renderItem: (item: T, index: number) => ReactNode;
  onItemLayout?: (item: T, layout: MasonryGridItemLayout) => void;
  columns?: number;
};

export default function MasonryGrid<T>({
  items,
  getKey,
  estimateItemHeight,
  renderItem,
  onItemLayout,
  columns = 2,
}: MasonryGridProps<T>) {
  const distributedColumns = useMemo(() => {
    const nextColumns: Array<Array<{ item: T; index: number }>> = Array.from(
      { length: columns },
      () => [],
    );
    const columnHeights = Array.from({ length: columns }, () => 0);

    const getShortestColumnIndex = () => {
      let shortestColumnIndex = 0;

      for (let columnIndex = 1; columnIndex < columnHeights.length; columnIndex += 1) {
        if (columnHeights[columnIndex] < columnHeights[shortestColumnIndex]) {
          shortestColumnIndex = columnIndex;
        }
      }

      return shortestColumnIndex;
    };

    items.forEach((item, index) => {
      const columnIndex = getShortestColumnIndex();
      nextColumns[columnIndex].push({ item, index });
      columnHeights[columnIndex] += estimateItemHeight(item, index);
    });

    return nextColumns;
  }, [columns, estimateItemHeight, items]);

  return (
    <View className="flex-row items-start gap-2">
      {distributedColumns.map((column, columnIndex) => (
        <View key={`masonry-column-${columnIndex}`} className="min-w-0 flex-1">
          {column.map(({ item, index }) => (
            <View
              key={getKey(item, index)}
              onLayout={(event) => {
                onItemLayout?.(item, event.nativeEvent.layout);
              }}
            >
              {renderItem(item, index)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}