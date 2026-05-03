export function estimateRecommendationCardHeight(index: number) {
  const imageHeights = [182, 240, 208, 262, 194, 228];
  return imageHeights[index % imageHeights.length] + 124;
}
