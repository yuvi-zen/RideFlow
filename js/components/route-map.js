/**
 * route-map.js - Live route map visualization for RideFlow
 */

class RouteMap {
    constructor(containerId = null) {
        this.container = containerId ? document.getElementById(containerId) : null;
    }

    render(route, options = {}) {
        if (!route || !this.container) {
            return;
        }

        const points = [route.pickup, ...(route.waypoints || []), route.dropoff];
        const driverLocation = route.driver_location || route.driver?.current_location;
        const progress = route.progress_pct || 0;
        const status = route.traffic_alert || route.status || 'On route';
        const matchInfo = route.match ? `${route.match.reason} (ETA ${route.match.pickup_eta_min} min)` : '';
        const trafficLabel = route.traffic_level || 'Normal';
        const fareLabel = route.fare_estimate ? formatCurrency(route.fare_estimate.estimated_total) : 'TBD';
        const stageLabel = route.active_stage ? capitalize(route.active_stage.replace(/_/g, ' ')) : 'Pending';

        this.container.innerHTML = `
            <div class="route-map-panel route-map-panel--compact">
                <div class="route-map-header">
                    <div>
                        <div class="map-title">Live Route Tracking</div>
                        <div class="map-meta">${route.pickup.label} → ${route.dropoff.label}</div>
                    </div>
                    <div class="map-status">${status}</div>
                </div>
                <div class="route-map" role="img" aria-label="Live route map">
                    ${points.map((point, index) => `
                        <div class="map-marker ${index === 0 ? 'pickup' : index === points.length - 1 ? 'dropoff' : 'waypoint'}">
                            <span>${index === 0 ? 'P' : index === points.length - 1 ? 'D' : 'W'}</span>
                        </div>
                    `).join('')}
                    <div class="route-path"></div>
                    ${driverLocation ? `
                        <div class="map-marker driver">
                            <span>🚗</span>
                        </div>
                    ` : ''}
                </div>
                <div class="map-legend">
                    <span class="legend-pill pickup">Pickup</span>
                    <span class="legend-pill dropoff">Drop-off</span>
                    <span class="legend-pill driver">Driver</span>
                </div>
                <div class="map-details">
                    <span class="legend-pill">Traffic: ${trafficLabel}</span>
                    <span class="legend-pill">Surge: ${route.surge_multiplier?.toFixed(2) || '1.00'}x</span>
                    <span class="legend-pill">Fare: ${fareLabel}</span>
                    <span class="legend-pill">Stage: ${stageLabel}</span>
                </div>
                <div class="route-timeline">
                    ${route.checkpoints.slice(0, 4).map(checkpoint => `
                        <div class="route-timeline-step route-timeline-step--${checkpoint.status.toLowerCase().replace(/\s+/g, '-')}">
                            <div class="timeline-icon">${checkpoint.type === 'pickup' ? 'P' : checkpoint.type === 'dropoff' ? 'D' : 'W'}</div>
                            <div>
                                <strong>${checkpoint.label}</strong>
                                <span>${checkpoint.status}</span>
                            </div>
                        </div>
                    `).join('')}
                    ${route.checkpoints.length > 4 ? `<div class="timeline-more">+${route.checkpoints.length - 4} more points</div>` : ''}
                </div>
                <div class="route-map-footer route-map-footer--dense">
                    <div class="map-stat"><span>Distance</span><strong>${route.distance_km.toFixed(1)} km</strong></div>
                    <div class="map-stat"><span>ETA</span><strong>${formatTime(route.eta)}</strong></div>
                    <div class="map-stat"><span>Progress</span><strong>${progress}%</strong></div>
                </div>
                ${matchInfo ? `<div class="route-note">${matchInfo}</div>` : ''}
                <div class="route-progress-bar"><div class="route-progress-fill" style="width: ${progress}%"></div></div>
            </div>
        `;
    }
}

window.RouteMap = RouteMap;
