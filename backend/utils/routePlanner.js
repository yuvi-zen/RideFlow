/**
 * routePlanner.js - Shortest-path route engine
 * Simple graph-based Dijkstra for demo zone + haversine distance for straight-line estimates
 */

/**
 * Convert degrees to radians
 */
function toRad(deg) {
  return deg * Math.PI / 180;
}

/**
 * Haversine distance between two lat/lng points in km
 */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimate route distance and duration
 * Uses haversine with a realistic road-route multiplier (~1.3x)
 * @param {number} pickupLat
 * @param {number} pickupLng
 * @param {number} dropLat
 * @param {number} dropLng
 * @param {number} avgSpeedKmh - default 30 km/h for urban
 * @returns {object} { distanceKm, durationMin, path: [{lat,lng}] }
 */
function estimateRoute(pickupLat, pickupLng, dropLat, dropLng, avgSpeedKmh = 30) {
  const straightLineKm = haversine(pickupLat, pickupLng, dropLat, dropLng);
  const roadRouteKm = straightLineKm * 1.3; // realistic road multiplier
  const durationMin = (roadRouteKm / avgSpeedKmh) * 60;

  // Generate a simple interpolated path (for visualization)
  const steps = 10;
  const path = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    path.push({
      lat: pickupLat + (dropLat - pickupLat) * t,
      lng: pickupLng + (dropLng - pickupLng) * t
    });
  }

  return {
    straight_line_km: parseFloat(straightLineKm.toFixed(2)),
    distance_km: parseFloat(roadRouteKm.toFixed(2)),
    duration_min: Math.round(durationMin),
    path,
    avg_speed_kmh: avgSpeedKmh
  };
}

/**
 * Dijkstra shortest path on a weighted graph (zone-based intersections)
 * @param {object} graph - adjacency list { nodeId: [{nodeId, weight}] }
 * @param {string} startNode
 * @param {string} endNode
 * @returns {object} { distance, path: [nodeIds] }
 */
function dijkstra(graph, startNode, endNode) {
  const dist = {};
  const prev = {};
  const visited = new Set();
  const pq = [];

  for (const node of Object.keys(graph)) {
    dist[node] = Infinity;
  }
  dist[startNode] = 0;
  pq.push({ node: startNode, dist: 0 });

  while (pq.length > 0) {
    pq.sort((a, b) => a.dist - b.dist);
    const { node: current } = pq.shift();

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === endNode) break;

    for (const edge of graph[current] || []) {
      if (visited.has(edge.nodeId)) continue;
      const newDist = dist[current] + edge.weight;
      if (newDist < dist[edge.nodeId]) {
        dist[edge.nodeId] = newDist;
        prev[edge.nodeId] = current;
        pq.push({ node: edge.nodeId, dist: newDist });
      }
    }
  }

  const path = [];
  let curr = endNode;
  while (curr) {
    path.unshift(curr);
    curr = prev[curr];
  }

  return {
    distance: dist[endNode] === Infinity ? null : dist[endNode],
    path: dist[endNode] === Infinity ? [] : path
  };
}

module.exports = {
  haversine,
  estimateRoute,
  dijkstra
};
