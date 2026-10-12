export function measure(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function snapPoint(point, targets, tolerance) {
  let closest = point;
  let distance = tolerance;
  for (const target of targets) {
    const candidate = measure(point, target);
    if (candidate <= distance) {
      closest = target;
      distance = candidate;
    }
  }
  return closest;
}

export function screenToPhysical(x, y, matrix) {
  return { x: matrix.a * x + matrix.c * y + matrix.e, y: matrix.b * x + matrix.d * y + matrix.f };
}

export function edgeTargets(width, height, axles = []) {
  return [
    { id: 'top-left', label: 'Upper left edge', x: 0, y: 0 },
    { id: 'top-right', label: 'Upper right edge', x: width, y: 0 },
    { id: 'bottom-left', label: 'Lower left edge / forward datum', x: 0, y: height },
    { id: 'bottom-right', label: 'Lower right edge', x: width, y: height },
    ...axles.map(axle => ({ id: axle.id, label: `${axle.title} center`, x: axle.position, y: height })),
  ];
}
