/**
 * routeTrace.ts
 *
 * Turns a route's GeoJSON LineString into a tiny SVG path for the route cards.
 *
 * Runs on the SERVER only, at build time: the snapshot's geometries carry up to
 * ~7.5k points each, and shipping those to the browser to draw a 120px
 * thumbnail would cost more than everything else on the page. The card receives
 * the finished `d` string and nothing else.
 *
 * There is no photo anywhere in the catalogue (`image_url` is null on every
 * linked POI), so the shape of the route IS the card's image: a 4-minute trail
 * reads as a short stroke, a grand tour as a long meander.
 */

export interface RouteTrace {
  /** SVG path data, in the coordinate space of `width` × `height`. */
  d: string;
  width: number;
  height: number;
  /** First and last point, so the card can mark where the route starts and ends. */
  start: [number, number];
  end: [number, number];
}

const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 62;
/** Keeps the stroke (and its round cap) clear of the viewBox edge. */
const PADDING = 5;
/**
 * Simplification budget, as a fraction of the route's own size. At the card's
 * render width this allows under a pixel of deviation, and takes the biggest
 * route from ~7.5k points to ~160.
 */
const EPSILON_DIVISOR = 150;

type Point = [number, number];

/**
 * Longitude degrees shrink towards the poles; without this the same route looks
 * stretched sideways in Lisbon and squashed in Rio. Project with the local
 * scale factor so the drawn shape matches what the map shows.
 */
function project(coords: number[][]): Point[] {
  const meanLat = coords.reduce((sum, [, lat]) => sum + lat, 0) / coords.length;
  const kx = Math.cos((meanLat * Math.PI) / 180);
  // y is negated because SVG grows downwards while latitude grows north.
  return coords.map(([lng, lat]) => [lng * kx, -lat]);
}

/**
 * Douglas–Peucker: keep the points that carry the shape, drop the rest.
 *
 * Deliberately not a radial-distance filter, which is cheaper but shaves the
 * extremes — exactly the bends that make one route recognisable from another at
 * thumbnail size. Iterative rather than recursive: a 7.5k-point city route would
 * blow the stack.
 */
function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    if (end <= start + 1) continue;

    const [ax, ay] = points[start];
    const [bx, by] = points[end];
    const dx = bx - ax;
    const dy = by - ay;
    const norm = Math.hypot(dx, dy);

    let worst = -1;
    let worstIndex = -1;
    for (let i = start + 1; i < end; i++) {
      const [x, y] = points[i];
      const distance = norm
        ? Math.abs(dx * (ay - y) - dy * (ax - x)) / norm
        : Math.hypot(x - ax, y - ay);
      if (distance > worst) {
        worst = distance;
        worstIndex = i;
      }
    }

    if (worst > epsilon) {
      keep[worstIndex] = true;
      stack.push([start, worstIndex], [worstIndex, end]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

/**
 * Builds the card thumbnail path, or null when there is nothing to draw.
 * The shape is centred and scaled to fit, preserving its real proportions —
 * stretching it to fill the box would make every route look the same.
 */
export function buildRouteTrace(
  coords: number[][] | null | undefined
): RouteTrace | null {
  if (!coords || coords.length < 2) return null;

  const points = project(coords);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const span = Math.max(spanX, spanY);
  if (!isFinite(span) || span <= 0) return null;

  const boxWidth = VIEW_WIDTH - PADDING * 2;
  const boxHeight = VIEW_HEIGHT - PADDING * 2;
  const scale = Math.min(boxWidth / (spanX || span), boxHeight / (spanY || span));
  const offsetX = PADDING + (boxWidth - spanX * scale) / 2;
  const offsetY = PADDING + (boxHeight - spanY * scale) / 2;

  const toView = ([x, y]: Point): [number, number] => [
    Number((offsetX + (x - minX) * scale).toFixed(1)),
    Number((offsetY + (y - minY) * scale).toFixed(1)),
  ];

  const drawn = simplify(points, span / EPSILON_DIVISOR).map(toView);
  const d = drawn.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join("");

  return {
    d,
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    start: drawn[0],
    end: drawn[drawn.length - 1],
  };
}
