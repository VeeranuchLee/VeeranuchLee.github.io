export function calculateGridGeometry({
  boardWidth,
  boardHeight,
  columns,
  rows,
  padding = 0,
  paddingX = padding,
  paddingY = padding,
  columnGap = 0,
  rowGap = columnGap,
  maxItemSize = Infinity
}) {
  const innerWidth = Math.max(0, boardWidth - paddingX * 2);
  const innerHeight = Math.max(0, boardHeight - paddingY * 2);
  const widthSize = Math.max(0, (innerWidth - columnGap * (columns - 1)) / columns);
  const heightSize = Math.max(0, (innerHeight - rowGap * (rows - 1)) / rows);
  const itemSize = Math.min(widthSize, heightSize, maxItemSize);

  return {
    itemSize,
    innerWidth,
    innerHeight,
    gridWidth: itemSize * columns + columnGap * (columns - 1),
    gridHeight: itemSize * rows + rowGap * (rows - 1)
  };
}
