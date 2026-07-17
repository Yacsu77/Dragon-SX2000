/**
 * Radial Menu — geometria do preview (polar / fatias).
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  if (NS.RadialGeometry) return;

  function degToRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function polar(radius, angleDeg) {
    const rad = degToRad(angleDeg);
    return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
  }

  function slicePath(index, total, outerR, innerR) {
    if (total <= 0) return "";
    if (total === 1) {
      return `M ${outerR} 0 A ${outerR} ${outerR} 0 1 1 ${-outerR} 0 A ${outerR} ${outerR} 0 1 1 ${outerR} 0 M ${innerR} 0 A ${innerR} ${innerR} 0 1 0 ${-innerR} 0 A ${innerR} ${innerR} 0 1 0 ${innerR} 0`;
    }
    const slice = 360 / total;
    const mid = -90 + slice * index;
    const half = slice / 2;
    const start = mid - half;
    const end = mid + half;
    const os = polar(outerR, start);
    const oe = polar(outerR, end);
    const is = polar(innerR, start);
    const ie = polar(innerR, end);
    const large = slice > 180 ? 1 : 0;
    return `M ${os.x} ${os.y} A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y} L ${ie.x} ${ie.y} A ${innerR} ${innerR} 0 ${large} 0 ${is.x} ${is.y} Z`;
  }

  NS.RadialGeometry = { degToRad, polar, slicePath };
})();
